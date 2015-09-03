webaudio-mod-player
===================

This is a MOD/S3M/XM module player implemented in JavaScript using the Web Audio API and runs fully within the browser.
 
The MOD player unit supports standard 4-channel Amiga Protracker modules, as well as 6- and 8-channel PC FastTracker modules.
Multichannel modules also work, although only mod.dope ('28CH') has been tested with. It also supports the Amiga "LED" lowpass
filter and most Protracker effects (although some bugs still remain).

The S3M player unit supports songs made in all versions of Scream Tracker 3. It performs mixing with a wider dynamic range
and uses "soft clipping" to roll off audio peaks without harsh limiting. Samples are interpolated with 32 bit floating
points for a very soft Ultrasoundish feel. Clicks from changing volume, looped samples and sample offset commands are being
mitigated using short ramps. 

The XM player unit is currently under development so several features are not yet implemented and the player has many
bugs. It is not yet recommended to use the XM player in "production".

You can test the player here:

<a href="http://mod.haxor.fi/">http://mod.haxor.fi/</a>


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
- MOD/S3M/XM module player for Web Audio (c) 2012-2015 Jani Halme
- Topaz TTF font (c) 2009 dMG of Trueschool and Divine Stylers
- "overload" (c) 1991 by Mantronix and Tip of Phenomena
- "Point of Departure" (c) 1995 Necros / FM
