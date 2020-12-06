"use strict";

$(function(){
  $.getJSON('./model.json',runApp);
});

function runApp (model) {

  window.model = model;


  // deserialize model in-place from json
  function initModel(m) {

    if (!m.slots) {
      m.slots = {};
    }

    m.items.forEach(function (item, idx) {
      item.x = item.x || 0;
      item.y = item.y || 0;
      item.index = item.index || idx;
      item.image = item.image || new Image();
      item.image.src = item.src;
      item.slot = item.slot || 0;
      item.attached = false;
      item.home = item.home || {};
      if ( !m.slots[item.slot] ){
        m.slots[item.slot] = {x:0,y:0};
      }
      // find out if items are attached
      if (item.x == m.slots[item.slot].x && item.y == m.slots[item.slot].y){
        item.attached = true;
        m.slots[item.slot].item = item;
      }

    });

    _.each(m.slots,function(slot){
      slot.x = slot.x || 0;
      slot.y = slot.y || 0;
    });

    m.background.image = m.background.image || new Image();
    m.background.image.src = m.background.src || '';

    m.canv = document.getElementById("bg");
    m.ctx = m.canv.getContext("2d");
    m.rescale = m.rescale === false ? false : true;
    m.resort = m.resort === false ? false : true;
    m.snap = m.snap || 0;
    m.quantize = typeof m.quantize == "undefined" ? false : m.quantize;
    m.editorOpen = m.editorOpen || false;
    m.imageSmoothing = typeof m.imageSmoothing == "undefined"? true : m.imageSmoothing;
  }

  // export model to JSON
  function serializeModel(mo) {
    var m = _.cloneDeep(mo);
    _.each(m, function (val, key) {
      if (key.charAt(0) == '_') {
        delete m[key];
      }
    });

    // remove slot item references
    _.each(m.slots,function(slot,index){
      if (slot.item){
        delete slot.item;
      }
    });

    m.items.forEach(function (item) {
      delete item.image;
      delete item.active;
    });
    delete m.background.image;
    delete m.canv;
    delete m.ctx;
    m.editorOpen = false;
    return JSON.stringify(m);
  }

  //--------------- view rendering ----------------------

  function render(m) {

    if (m.pageBackground && m.pageBackground != document.body.style['background']){
      document.body.style['background'] = m.pageBackground;
    }
    //calculate size of canvas
    var cs = 1;
    if (m.rescale){
      cs = Math.min(window.innerWidth / m.background.image.width,window.innerHeight / m.background.image.height)
    }

    //leave room for editor
    if (m.editorOpen){
      cs = Math.min((window.innerWidth-400) / m.background.image.width,window.innerHeight / m.background.image.height);
    }

    m.canv.width = cs * m.background.image.width;
    m.canv.height = cs * m.background.image.height;

    var s = getScale(m);
    m.ctx.imageSmoothingEnabled = m.imageSmoothing;
    m.ctx.setTransform(s, 0, 0, s, 0, 0);

    m.ctx.drawImage(m.background.image, 0, 0);
    _.sortBy(m.items, 'index').forEach(function (item) {
      //draw each item from low index to high
      if (item._hidden) {
        return;
      }
      if (!item.image){
        return;// not drawing broken image
      }
      try{
        m.ctx.drawImage(item.image, item.x, item.y);
      }catch(e){
        console.warn("caught trying to draw broken image: "+item.src);
        item.image = null;
      }

      if (m.editorOpen && item.bounds && item.bounds.length > 1){

          m.ctx.strokeStyle = 'red';
          m.ctx.beginPath();

          m.ctx.moveTo(item.bounds[0].x+item.x,item.bounds[0].y+item.y)
          for (var i = 1,len=item.bounds.length; i < len; i++){
            m.ctx.lineTo(item.bounds[i].x+item.x,item.bounds[i].y+item.y);
          }
          m.ctx.stroke();

      }

    });
  }

  //---------------- controller logic ----------------

  function runController(m) {

    var downAt = { x: 0, y: 0 };

    var $c = $(m.canv);

    // hit test(x,y)
    // returns the item that is hit, or null
    function hitTest(x, y) {
      var ret = null;
      //iterate in reverse over the items
      _.each(_.orderBy(m.items, 'index', 'desc'), function (i) {
        if (!i.bounds) {
          if (!i.image){
            return;
          }
          var w = i.image.width;
          var h = i.image.height;
          if (x > i.x && y > i.y && x < i.x + w && y < i.y + h) {
            //hit this item
            ret = i;
            return false;
          }
        } else {
          // have bounds
          var localBounds = i.bounds.map(function(coords){
            return {x:coords.x + i.x, y:coords.y + i.y}
          });
          if( pip({x:x,y:y},localBounds) ){
            ret = i;
            return false;
          }
        }
      });
      return ret;
    }

    $c.on('mousedown touchstart', function (e) {
      var s = getScale(m);
      var ssx;
      var ssy;
      if (e.type == 'touchstart'){
        ssx = (e.originalEvent.touches[0].clientX - this.offsetLeft) / s;
        ssy = (e.originalEvent.touches[0].clientY - this.offsetTop) / s;
      }else{
        ssx = e.offsetX / s; //screenspace X
        ssy = e.offsetY / s;
      }
      // console.log(ssx,ssy);
      var hit = hitTest(ssx, ssy);
      if (hit) {
        if (m.resort) {
          hit.index = new Date().getTime();
        }
        // make it the active one
        _.each(m.items, function (item) {
          item.active = false;
        });
        hit.active = true;
        downAt.x = ssx - hit.x;
        downAt.y = ssy - hit.y;
      }
      e.originalEvent.preventDefault();
      return false;
    });

    $c.on('mousemove touchmove', function (e) {
      var active = _.find(m.items, 'active');

      //move the thingy
      var s = getScale(m);
      var ssx;
      var ssy;
      if (e.type == 'touchmove'){
        ssx = (e.originalEvent.touches[0].clientX - this.offsetLeft) / s;
        ssy = (e.originalEvent.touches[0].clientY - this.offsetTop) / s;
      }else{
        ssx = e.offsetX / s; //screenspace X
        ssy = e.offsetY / s;
      }

      if (active) {
        active.x = ssx - downAt.x;
        active.y = ssy - downAt.y;
        //snap it
        if ( m.snap && m.slots[active.slot] && sqDist(active, m.slots[active.slot]) < m.snap ) {
          var slot = m.slots[active.slot];
          active.x = slot.x;
          active.y = slot.y;
          active.attached = true;
          if(slot.item && slot.item.src != active.src && slot.item.attached ){
            sendHome(slot.item);
          }
          slot.item = active;
        }else{
          active.attached = false;
        }
      }

      var hit = hitTest(ssx, ssy);
      if (hit){
       m.canv.style.cursor = "pointer";
      }else{
        m.canv.style.cursor = "default";
      }
      e.originalEvent.preventDefault();
      return false;

    });

    $c.on('mouseup touchend touchcancel', function (e) {
      var active = _.find(m.items, 'active');
      if (active) {
        active.active = false;
        var slot = m.slots[active.slot];
        if (m.quantize){
          active.x = Math.round(active.x);
          active.y = Math.round(active.y);
        }
      }
    });

      // toggle dev mode
    $(document.body).on('keyup', function (e) {
      if (e.key == "Delete" && e.ctrlKey) {
        m.editorOpen = !m.editorOpen;
      }
    });
  }

  function computeItemBounds(m){
    console.info("Computing part bounds...");
      async.eachSeries(m.items, function iteratee(item, callback) {
        calcPath(item.src, function (er, bounds) {
          if (er) {
            return callback(er);
          }
          item.bounds = bounds;
          console.info(bounds);
          callback(null);
        });
      }, function done(er) {
        if(er){return console.error(er)}
        console.info('got all image bounds');
      });
  }

  //  send an item home
  function sendHome(item){
    if (item.home && typeof item.home.x == "number"){
      item.x = item.home.x;
      item.y = item.home.y;
      item.attached = false;
    }
  }


  //------------------ run ------------------

  initModel(model);
  runController(model);
  animFrame();
  function animFrame() {
    render(model);
    // TODO save some CPU/GPU and only actually render if the model changed
    requestAnimationFrame(animFrame);
  }


  // -------------------- Vue app controller --------------

  var v = new Vue({
    data: model,
    el: '#sidebar',
    methods: {
      addItem: function () {
        console.log(";)");
        this.items.push({ src: "./img/image.png", slot: 0, x:0, y:0 });
        initModel(this);
        computeItemBounds(this);
      },
      removeItem:function(idx){
        this.items.splice(idx, 1);
      },
      duplicateItem:function(item){
        this.items.push(_.clone(item))
      },
      moveUp:function(index){
        var items = this.items;
        if (index <= 0){return}
        var tmp = _.clone(items[index]);
        _.extend(items[index],items[index - 1]);
        _.extend(items[index-1],tmp);
        this.reloadAll();
      },
      moveDown:function(index){
        var items = this.items;
        if (index >= items.length){return}
        var tmp = _.clone(items[index]);
        _.extend(items[index],items[index + 1]);
        _.extend(items[index+1],tmp);
        this.reloadAll();
      },
      reloadItem:function(item){
        //reload image for item
        item.image = new Image();
        item.image.src = item.src;
        computeItemBounds(this);
      },
      reloadAll:function(){
        initModel(this);
        computeItemBounds(this);
      },
      computeItemBounds:function(){
        computeItemBounds(this);
      },
      setHomes:function(){
        this.items.forEach(function(item){
          item.home = {x: item.x, y:item.y}
        });
      }
    },
    computed:{
      json:function(){
        return serializeModel(this.$data);
      }
    }
  });

  // end document.ready
}

//---------------------------------- helpers ----------------------------------















/*
  get
*/
function getScale(m) {
  if (m.rescale) {
    var sx = m.canv.width / m.background.image.width;
    var sy = m.canv.height / m.background.image.height;
    return Math.min(sx, sy);
  }
  return 1;
}

/*
  squared distance
*/
function sqDist(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}


/*
  calculate bounding path of an image
*/
function calcPath(url, callback) {

  var AMASK = 0x000000ff // alpha mask
  var AMIN = 5 // alpha minimum to count as part of the image
  var canvas = document.getElementById('meas')

  if (!canvas) {
    canvas = document.createElement("canvas")
    canvas.width = 10
    canvas.height = 10
    canvas.style = "display:none;"
    document.body.appendChild(canvas)
  }

  var img = new Image(),
      w = canvas.width,
      h = canvas.height,
      ctx = canvas.getContext('2d');

  img.crossOrigin = ''
  img.onload = getBounds
  img.src = url

  // this part is synchronous, so although it uses just 1 canvas, single-threading guarantees it will be ok
  function getBounds() {

    canvas.width = w = this.width
    canvas.height = h = this.height
    // have to clear in case canvas is being re-used
    ctx.clearRect(0, 0, w, h)
    try{
      ctx.drawImage(this, 0, 0, w, h)
    }catch(e){
      console.warn("image could not be drawn for measurement");
      return
    }

    var idata = ctx.getImageData(0, 0, w, h),
        buffer = idata.data,
        buffer32 = new Uint32Array(buffer.buffer),
        x,
        y,
        pts = [];

    function hit(x,y){
      //return buffer32[x+y*w] > 0;
      return idata.data[4*(x+y*w)+3] > 0xf0;
    }

    // get top, ltr
    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) {
        if (hit(x,y)) {
            pts.push({x:x,y:y-1});
          break;
        }
      }
    }

    // get bottom, rtl
    for (x = w; x >= 0; x--) {
      for (y = h; y >= 0; y--) {
        if (hit(x,y)) {
            pts.push({x:x,y:y+1})
          break
        }
      }
    }

    pts.push(pts[0])// re-add the first as the last point, for better path optimization
    pts = simplify(pts,2)
    pts.shift()// pop the first off since it's the same

    return callback(null,pts)

  }
}


console.info("Drex: press Ctrl + Delete to open Editor");

/*
Below this: copyright James Halliday, modified and used under MIT license
https://github.com/substack/point-in-polygon

The MIT License (MIT)

Copyright (c) 2016 James Halliday

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

function pip (point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point.x, y = point.y;

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x, yi = vs[i].y;
        var xj = vs[j].x, yj = vs[j].y;

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};
