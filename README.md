webaudio-mod-player
===================

This is a Protracker module player implemented in JavaScript using the Web Audio API. It supports standard 4-channel Amiga Protracker modules, as well as 6- and 8-channel PC FastTracker modules. Multichannel modules also work, although mod.dope ('28CH') has only been tested with.

You can test the player here:

<a href="http://mod.haxor.fi/">http://mod.haxor.fi/</a>

The player supports most Protracker effects, including the 'LED filter' command. Some effects still need work, though (try playing mod.black_queen by Dreamer - pattern loops fail spectacularly).

To install on your own server, clone the repo to the document root and edit+rename example.htaccess to match your domain. Then create a directory 'mods' alongside index.php and structure is like this (note Amiga-style filenames with lowercase 'mod'!):

mods<br/>
mods/Mantronix_and_Tip<br/>
mods/Mantronix_and_Tip/mod.overload<br/>
mods/mod.saf<br/>



Copyrights:

- Protracker module player for Web Audio (c) 2012-2014 Jani Halme

- Topaz TTF font (c) 2009 dMG of Trueschool and Divine Stylers

- mod.overload (c) 1991 by Mantronix and Tip of Phenomena

