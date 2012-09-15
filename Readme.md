# vidchat

__vidchat__ is experimental video chat implementation with Node.js + Socket.IO + WebRTC.

* [Screencast](https://vimeo.com/36229857)

![vidchat](http://f.cl.ly/items/2L1P3S2c3F3p2N3l3Y0U/webrtc.png)

## Authors

  - Seiya Konno &lt;nulltask@gmail.com&gt; ([nulltask](https://github.com/nulltask))

## Requirement

* Node v0.6.10
* [Google Chrome 18+](http://tools.google.com/dlpage/chromesxs) with [--enable-media-stream](http://www.webrtc.org/running-the-demos)

## Installation

#### Install Node (using nave)

    $ nave install 0.6.10
    $ nave use 0.6.10

#### Grab code and resolving module dependencies.

    $ git clone git@github.com:nulltask/vidchat.git
    $ cd vidchat
    $ npm install

#### Run
    
    $ node app

## TODO

* Multiple user support
* Room (namespace) system
* Text based chat
* Support for binary transfer

## License

(The MIT License)

Copyright (c) 2012 Seiya Konno. &lt;nulltask@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.