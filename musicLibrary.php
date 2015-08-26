<?php
  ///////////////////
  // configuration
  //

  // relative path containing the modules - must be within the documentroot!
  $songpath="mods";

  //
  //
  ///////////////////


  // initialize to empty
  $library=array();
  
  // songs grouped by composer
  foreach (glob($songpath."/*", GLOB_ONLYDIR) as $composer) {
    $d=array();
    $d['composer']=preg_replace('/^(.*)\//', '', $composer);
    $songs=array();
    $dir=opendir($composer);
    while($mod=readdir($dir)) {
      if (is_file($composer."/".$mod)) 
      $songs[]=array('file'=>$mod, 'size'=>filesize($composer."/".$mod));
    }
    closedir($dir);
    $d['songs']=$songs;
    $library[]=$d;
  }

  // songs by an unknown composer from the root of "mods/"
  $d=array('composer'=>'Unknown');
  $songs=Array();
  $dir=opendir("mods");
  $i=0;
  while($mod=readdir($dir)) {
    if (is_file("mods/".$mod))
      $songs[]=array('file'=>$mod, 'size'=>filesize($songpath."/".$mod));
  }
  closedir($dir);
  $d['songs']=$songs;
  $library[]=$d;

  echo json_encode($library);
?>