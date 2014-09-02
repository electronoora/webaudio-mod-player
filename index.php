<!-- Amiga Protracker module player for Web Audio (c) 2012-2013 Firehawk/TDA (firehawk@haxor.fi) -->
<?php
  ///////////////////
  // configuration
  //

  // when entering the website without a mod selected, the site will randomly pick one from
  // the array below
  $defmods=array(
    "mods/Mantronix_and_Tip/mod.overload"
  );

  //
  //
  ///////////////////
  
  $defmod=$defmods[rand(0, count($defmods)-1)];
  if (array_key_exists('mod', $_REQUEST) && $_REQUEST['mod']!="") $defmod="mods/".$_REQUEST['mod'];
?>
<html>
  <head>
    <title>Protracker module player for Web Audio</title>
    <meta name="description" content="A Protracker/Fasttracker module player in Javascript using the Web Audio API. Supports Chrome 14+ and Safari 6.">
    <link rel="stylesheet" href="/style.css" type="text/css" media="screen" />
    <script src="http://code.jquery.com/jquery-2.1.1.js"></script>
<?php
$browserAsString = $_SERVER['HTTP_USER_AGENT'];
if (strstr($browserAsString, " AppleWebKit/") && strstr($browserAsString, " Mobile/"))
{
  echo "    <script type=\"text/javascript\">var mobileSafari=true;</script>";
} else {
  echo "    <script type=\"text/javascript\">var mobileSafari=false;</script>";
}
?>    
    <script type="text/javascript" src="/js/pt.js"></script>
    <script type="text/javascript" src="/js/ui.js"></script>
  </head>
  <body>
    <div id="outercontainer">
      <div id="headercontainer">
        <div style="margin-left:8px;float:left">Protracker module player for Web Audio</div>
        <div style="margin-right:8px;float:right">(c) 2012-2014 Firehawk/<a class="tdalink" href="http://tda.haxor.fi/" target="_blank">TDA</a></div>
        <div style="clear:both;"></div>
      </div>
      <div id="innercontainer">
        <div id="modsamples"><?php for($i=0;$i<31;$i++) echo "\n"; ?></div>
        <div style="position:relative;top:8px;margin-bottom:8px;">
          <span id="modtitle"></span>
          <span id="modinfo"></span>
          <span id="modtimer"></span>
          <br/><br/>
          <a class="inactive" href="#" id="prev_track">[|&lt;]</a>
          <a href="#" id="go_back">[&lt;&lt;]</a>
          <a href="#" id="play">[play]</a>
          <a href="#" id="pause">[pause]</a>
          <a href="#" id="go_fwd">[&gt;&gt;]</a>
          <a class="inactive" href="#" id="next_track">[&gt;|]</a>
          <span style="white-space:pre;">     </span>
          <a href="#" title="Repeat song" id="modrepeat">[rept]</a>
          <a class="down" title="Stereo separation" href="#" id="modpaula">[)oo(]</a>
          <a class="down" title="Amiga clock" href="#" id="modclock">[&nbsp;PAL]</a>
          <a class="down" title="Amiga model A500 or A1200" href="#" id="modamiga">[A500]</a>
          <a href="#" id="load_song">[load song]</a>
        </div> 
        <div id="modpattern"></div>
        <div style="clear:both"></div>
        <div id="infotext">
          Note that this is somewhat experimental and is tested on Chrome 14+, Firefox 24+ and Safari 6+ so far. <span style="color:#faa">Disable AdBlock if you get cuts or stuttering!</span>
          Email <a href="mailto:firehawk@haxor.fi" style="color:#cce">firehawk@haxor.fi</a> to report bugs, send suggestions or request songs. :) Source code available in <a href="https://github.com/jhalme/webaudio-mod-player">GitHub</a>.
        </div>
      </div>
      
      <div style="display:none;" id="loadercontainer">
        <div id="musiclibrary">
          <br/>dh0:music_library&gt;<br/><br/>
          <select size="24" id="modfile">
<?php
  $i=0;
  foreach (glob("mods/*", GLOB_ONLYDIR) as $composer) {
      echo "          <optgroup class=\"".(($i&1)?("odd"):("even"))."\" label=\"".strtr(substr($composer, strpos($composer, "/")+1), "_", " ")."\">\n";
      foreach(glob($composer."/mod.*") as $mod) {
        echo "            <option class=\"".(($i&1)?("odd"):("even"))."\" ".(($defmod==$mod)?("selected "):(""))."value=\"/".$mod."\">".substr($mod, strrpos($mod, "/")+1).
             " <span class=\"filesize\">(".filesize($mod)." bytes)</span></option>\n";
      }
      echo "          </optgroup>\n"; 
      $i++;
  }
  echo "          <optgroup class=\"".(($i&1)?("odd"):("even"))."\" label=\"Unknown\">\n";
  foreach (glob("mods/mod.*") as $mod) {                   
    echo "            <option class=\"".(($i&1)?("odd"):("even"))."\" ".(($defmod==$mod)?("selected "):(""))."value=\"/".$mod."\">".substr($mod, strpos($mod, "/")+1).
         " <span class=\"filesize\">(".filesize($mod)." bytes)</span></option>\n";    
  }
  echo "          </optgroup>\n";
?>
          </select>
          <div style="clear:left;"></div>
          <div style="margin-left: 24px;">
            <a href="#" id="load_cancel">[&lt; back]</a>&nbsp;
            <a href="#" id="load">[load song]</a>&nbsp;
            <a href="#" id="add_playlist">[add +&gt;]</a>
          </div>
        </div>
        
        <div id="playlist">
        <br/>playlist&gt;<br/><br/>
        <select size="24" id="playlist_box">
        <!-- <option value="">Playlist is empty</option> -->
        </select>
          <div style="clear:right;"></div>
          <div style="margin-left: 24px;">
            <a href="#" id="playlist_up">[^^]</a>&nbsp;
            <a href="#" id="playlist_dn">[vv]</a>&nbsp;
            <a href="#" id="playlist_remove">[remove]</a>&nbsp;
            <a href="#" id="playlist_clear">[clear]</a>&nbsp;
            <a href="#" id="playlist_jumpto">[play song]</a>
          </div>        
        </div>
        
        <div style="clear:both"></div>
<!--        <br/><br/>Choose a song from the listbox and click 'load song' or doubleclick song to open it into the player. -->
      </div>
      
      
    </div>
  </body>
</html>
