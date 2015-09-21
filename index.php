<!-- MOD/S3M module player for Web Audio (c) 2012-2015 Firehawk/TDA (firehawk@haxor.fi) -->
<?php
  ///////////////////
  // configuration
  //

  // when entering the website without a mod selected, the site will randomly pick one from
  // the array below
  $defmods=array(
    "Necros/point_of_departure.s3m",
    "Skaven/autonomous.s3m",
    "Dune/x14.s3m",
    "Purple_Motion/2nd_pm.s3m",
    "Mantronix_and_Tip/mod.overload",
    "Lizardking/mod.desert_dawn",
    "Jester/mod.elysium",
    "Uncle_Tom/mod.occ-san-geen",
    "Captain/mod.beyond_music",
    "Groo/mod.electrification"
  );

  // absolute URL path to where the modules are located - leading and trailing slashes are required!
  $modulePath="/mods/";

  //
  //
  ///////////////////
?>
<html>
  <head>
    <title>Protracker module player for Web Audio</title>
    <meta name="description" content="A MOD/S3M module player in Javascript using the Web Audio API. Supports Chrome 14+ and Safari 6.">
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
    <script type="text/javascript" src="/js/player.js"></script>
    <script type="text/javascript" src="/js/pt.js"></script>
    <script type="text/javascript" src="/js/st3.js"></script>
    <script type="text/javascript" src="/js/ft2.js"></script>
    <script type="text/javascript" src="/js/ui.js"></script>
    <script type="text/javascript">
      window.musicPath='<?php echo $modulePath; ?>';
      window.musicLibrary=[];
<?php
  // randomize default song  
  $defmod=$defmods[rand(0, count($defmods)-1)];
  if (array_key_exists('mod', $_REQUEST) && $_REQUEST['mod']!="") $defmod=$_REQUEST['mod'];
  if (array_key_exists('composer', $_REQUEST) && $_REQUEST['composer']!="") {
    echo "      window.currentModule='';\n";
    echo "      window.defaultComposer='".$_REQUEST['composer']."';\n";
  } else {
    echo "      window.currentModule='".$defmod."';\n";
    echo "      window.defaultComposer='';\n";
  }
?>
    </script>
  </head>
  <body>
    <div id="outercontainer">
      <div id="headercontainer">
        <div style="margin-left:8px;float:left">MOD/S3M module player for Web Audio</div>
        <div style="margin-right:8px;float:right">(c) 2012-2015 Firehawk/<a class="tdalink" href="http://tda.haxor.fi/" target="_blank">TDA</a></div>
      </div>
      <div style="clear:both;"></div>
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
          <a class="down" title="Visualization type" href="#" id="modvis">[trks]</a>
          <a title="Amiga A500 lowpass filter" href="#" id="modamiga">[filt]</a>
          <a href="#" id="load_song">[load song]</a>
        </div> 
        <div id="modchannels"><div id="even-channels"></div><div id="odd-channels"></div></div>
        <div id="modpattern"></div>
        <div style="clear:both"></div>
        <div id="infotext">
          The player has been tested on Chrome 14+, Firefox 24+, Safari 6+ and Edge 20+ so far. <span style="color:#faa">Disable AdBlock if you get cuts or stuttering!</span>
          To report bugs, suggest features or request songs, contact me on <a href="https://twitter.com/janihalme" style="color:#cce;">Twitter</a> or
          email <a href="mailto:firehawk@haxor.fi" style="color:#cce">firehawk@haxor.fi</a>.
          Source code available on <a style="color:#cce;" target="_blank" href="https://github.com/jhalme/webaudio-mod-player">GitHub</a>.
        </div>
      </div>
      
      <div style="display:none;" id="loadercontainer">
        <div id="musiclibrary">
          <br/>dh0:music_library&gt;<br/><br/>
          <select size="24" id="modfile"></select>
          <br/><br/>
          <div style="clear:left;"></div>
          <div style="margin-left: 24px;">
            <a href="#" id="load_cancel">[&lt; back]</a>&nbsp;
            <a href="#" id="load">[load song]</a>&nbsp;
            <a href="#" id="add_playlist">[add +&gt;]</a>
          </div>
          <div style="margin-left: 24px; margin-top: 12px;">
          <input value="" id="loadfilter" size="48" placeholder="Filter songs" style="border: 1px solid #8f8; background-color: #181818" />
          </div>
        </div>
        
        <div id="playlist">
        <br/>ram:playlist&gt;<br/><br/>
        <select size="24" id="playlist_box">
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
      </div>

    </div>
  </body>
</html>
