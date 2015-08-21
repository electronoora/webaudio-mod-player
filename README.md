webaudio-mod-player
===================

This is a MOD/S3M module player implemented in JavaScript using the Web Audio API and runs fully within the browser.
 
The MOD player unit supports standard 4-channel Amiga Protracker modules, as well as 6- and 8-channel PC FastTracker modules.
Multichannel modules also work, although mod.dope ('28CH') has only been tested with. It also supports the Amiga "LED" lowpass
filter and most Protracker effects (yes - there are bugs and missing features).

The S3M player unit supports songs made in all versions of Scream Tracker 3. It performs mixing with a wider dynamic range
and uses "soft clipping" to roll off audio peaks without harsh limiting. Samples are interpolated with 32 bit floating
points for a very soft Ultrasoundish feel. It also has some of those darned Ultraclicks, although most are being avoided by
using volume ramping.

You can test the player here:

<a href="http://mod.haxor.fi/">http://mod.haxor.fi/</a>


To install on your own server, clone the repo to the document root and edit+rename example.htaccess to match your domain.
Then create a directory 'mods' alongside index.php and structure is like this (note that both PC-style and Amiga-style filenames
are supported - extension must be lowercase):

/mods<br/>
/mods/Mantronix_and_Tip<br/>
/mods/Mantronix_and_Tip/mod.overload<br/>
/mods/Necros<br/>
/mods/Necros/point.s3m<br/>
/mods/mod.saf<br/>



Copyrights:

- Protracker module player for Web Audio (c) 2012-2015 Jani Halme

- Topaz TTF font (c) 2009 dMG of Trueschool and Divine Stylers

- "overload" (c) 1991 by Mantronix and Tip of Phenomena

- "Point of Departure" (c) 1995 Necros / FM

