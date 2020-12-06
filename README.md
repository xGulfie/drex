# Drex

This is a HTML5 dress up game engine with a built-in editor.

## [Try it Out!](https://cdn.jsdelivr.net/gh/xgulfie/drex@master/index.html)

# User Guide

This is how you would build your own dress up game with this project.  I'm assuming you know how to use a computer, open .zip files, and create images.

#### Get and Serve the Project

First, clone this repository with Git, or alternatively just download the .zip file and extract it somewhere.

Now, run a local http server in that directory and open it in a browser.

> try `python -m SimpleHTTPServer 8000` then go to `localhost:8000` in the browser if you have Python... npm module `hs` works well, too.  

After navigating to the project in the browser (you'll see a duck), press `ctrl+delete` to open the editor.

#### Create your Image Files

The best way to do organize your image files is to create your "background" image (which doesn't move), then create items to be added on top of that as layers in your favorite multi-layer editing program.  You should line the items up over the background **where they should rest when they are attached**.  In the example files, I have included the source `duck.xcf` to show you how this works.  Notice how the hats are on top of each other on the duck's head.  Next, you will need to export the background and each item as separate images.  **MAKE SURE** that the images are all the same dimensions.  I recommend placing them in the `img` directory but you can change that if you like.

The image click boundaries are automatically calculated by looking for an opaque area in the item images.  So keep this in mind when creating your item layers.

#### The Editor

Now, go to the editor (`ctrl+delete` in the browser window) and go the the Items pane.  Change the source URLs of the background image and the item URLs in the editor window, and add/delete items as needed.  The icons in the window will update automatically.  You may have to click "reload on canvas" for the item to show in the dressup area.

Next, click "re-compute image bounds" in the "Data" pane.  This should put red outlines on all of your items and make them draggable.  Then give each item an appropriate slot.  

You can decide for yourself which slot goes with which item (i.e. slot 1 is the head, slot 2 is gloves, slot 539 is shoes, whatever).  Each slot can only have one item at a time, unless the slot is -1.  Infinite items can be places in slot -1.

Next, place each item where you want it to appear when not attached, then click "set home positions" in the items pane.

> The "Home" position of the item is where it goes when a user replaces it with something else.  For example, if a user puts hat A on the character, then puts hat B on it, hat A will fly back to its "home" position.

Finally, Copy the JSON text out of the "data" pane, then paste it in the `model.json` file in the project files.  Now, when you reload the page, the items will all be in position where you left them.  You should be pretty much done now.

##### Editor Options

`resort`:  Whether to bring items to the top when selected.
`rescale`: Whether to re-scale the canvas window to fit the user's browser.
`quantize`: Whether to snap the item positions to pixels when moving them freely.  Leave off unless you have pixel art.
`imageSmoothing`: Whether to smooth pixelswhen the image is scaled.  Leave on unless you have pixel art.
