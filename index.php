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
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
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
    <script type="text/javascript">
      var _gaq = _gaq || [];
      _gaq.push(['_setAccount', 'UA-771017-5']);
      _gaq.push(['_trackPageview']);
      (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
      })();
    </script>
  </head>
  <body>
    <div id="outercontainer">
      <div id="headercontainer">
        <div style="margin-left:8px;float:left">Protracker module player for Web Audio</div>
        <div style="margin-right:8px;float:right">(c) 2012-2013 Firehawk/<a class="tdalink" href="http://tda.haxor.fi/" target="_blank">TDA</a></div>
        <div style="clear:both;"></div>
      </div>
      <div id="innercontainer">
        <div id="modsamples"><?php for($i=0;$i<31;$i++) echo "\n"; ?></div>
        <div style="position:relative;top:8px;margin-bottom:8px;">
          <span id="modtitle"></span>
          <span id="modinfo"></span>
          <span id="modtimer"></span>
          <br/><br/>
          <a href="#" id="go_back">[&lt;&lt;]</a>
          <a href="#" id="play">[play]</a>
          <a href="#" id="pause">[pause]</a>
          <a href="#" id="go_fwd">[&gt;&gt;]</a>
          <span style="white-space:pre;">     </span>
          <a href="#" title="Repeat song" id="modrepeat">[rept]</a>
          <a class="down" title="Stereo separation" href="#" id="modpaula">[)oo(]</a>
          <a class="down" title="Amiga clock" href="#" id="modclock">[&nbsp;PAL]</a>
          <a href="#" id="load_song">[load song]</a>
        </div> 
        <div id="modpattern"></div>
        <div style="clear:both"></div>
        <div id="infotext">
          Note that this is somewhat experimental and is tested on Chrome 14+, Firefox 24+ and Safari 6+ so far. <span style="color:#faa">Disable AdBlock if you get cuts or stuttering!</span>
          Email <a href="mailto:firehawk@haxor.fi" style="color:#cce">firehawk@haxor.fi</a> to report bugs, send suggestions or request songs. :)
        </div>
      </div>
      <div style="display:none;" id="loadercontainer">
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
        <div id="fileinfo">Choose a song from the listbox and click 'load' to open it into the player.<br/><br/>Doubleclicking the song works also.</div>
        <div style="clear:both;"></div>
        <div style="margin-left: 24px;"><a href="#" id="load">[load]</a> <a href="#" id="load_cancel">[cancel]</a></div>
      </div>
    </div>
  </body>
</html>
