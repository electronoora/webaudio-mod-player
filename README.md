webaudio-mod-player
===================

![Screenshot](https://raw.githubusercontent.com/jhalme/webaudio-mod-player/master/screenshot.jpg)

This is a MOD/S3M/XM module player implemented in Javascript using the Web Audio API and runs fully within the browser. It
has been tested and confirmed to work on Chrome 14+, Firefox 24+, Safari 6+ and Edge 20+. The Javascript performance of
the browsers varies significantly, so some modules may stutter on one browser while the same module can play flawlessly
on other ones. YMMV.

Although internally each file format is handled by a format specific player class, a front-end wrapper class is used to
provide a common programming interface for the player.

All player classes use 32-bit floating point arithmetic in the channel mixing code, as well as a wide dynamic range. The
output is scaled down to [-1, 1] domain using a "soft clipping" algorithm to roll off any audio peaks without harsh-sounding
limiting. This should - in most cases - produce a reasonably constant audio volume for all modules.

Additionally, S3M and XM player classes use linear sample interpolation and volume ramping to produce a smooth Gravis
Ultrasound -like sound quality. The MOD player class attempts to sound more like an Amiga by allowing audio aliasing and
applying a low pass filter.

None of the player classes fully implement all the features and effects in each file format, but all the major ones should
be implemented. In addition, there most certainly will be some playback bugs in each player class - let me know if you run
into some bad ones. 

You can test the player here:

<a href="https://mod.haxor.fi/">https://mod.haxor.fi/</a>


To install on your own server, clone the repo to the document root and edit+rename example.htaccess to match your domain.
Then create a directory 'mods' alongside index.php and structure is like this (note that both PC-style and Amiga-style filenames
are supported but extension must always be in lowercase):

/mods<br/>
/mods/Mantronix_and_Tip<br/>
/mods/Mantronix_and_Tip/mod.overload<br/>
/mods/Necros<br/>
/mods/Necros/point.s3m<br/>
/mods/mod.saf<br/>


Copyrights:
- MOD/S3M/XM module player for Web Audio (c) 2012-2017 Jani Halme
- Topaz TTF font (c) 2009 dMG of Trueschool and Divine Stylers
- "overload" (c) 1991 by Mantronix and Tip of Phenomena
- "Point of Departure" (c) 1995 Necros / FM
