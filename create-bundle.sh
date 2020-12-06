#!/bin/bash

# lmao yes this is real life and I really did this

seperator='
;
'

echo '' > js/bundle.js

urls='https://raw.githubusercontent.com/mourner/simplify-js/f9b50b68ecaa8fd5ab7a525c66e363c7eaaa9e4e/simplify.js
https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.15.0/lodash.min.js
https://cdnjs.cloudflare.com/ajax/libs/async/2.5.0/async.min.js
https://cdnjs.cloudflare.com/ajax/libs/vue/2.0.5/vue.min.js
https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery.min.js'

echo "$urls" | while read url
do
  data=$(curl ${url})
  echo "$data" >> js/bundle.js
  echo "$seperator" >> js/bundle.js
done

