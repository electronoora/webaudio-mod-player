/*
  user interface stuff for the web audio module player
  (c) 2012-2014 firehawk/tda
*/
var notelist=new Array("C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-");

function notef(n,s,c,d,cc)
{
  if (cc<8)
    return (n ? ("<span class=\"note\">"+notelist[n%12]+Math.floor(1+n/12)+" </span>") : ("... "))+
      (s ? ("<span class=\"sample\">"+hb(s)+"</span> ") : (".. "))+
      "<span class=\"command\">"+c.toString(16)+hb(d)+"</span>|";
  if (cc<12)
    return (n ? ("<span class=\"note\">"+notelist[n%12]+Math.floor(1+n/12)+"</span>") : ("..."))+
      (s ? ("<span class=\"sample\">"+hb(s)+"</span>") : (".."))+
      "<span class=\"command\">"+c.toString(16)+hb(d)+"</span>|";
  return (n ? ("<span class=\"note\">"+notelist[n%12]+Math.floor(1+n/12)+"</span>") : 
                (s ? (".<span class=\"sample\">"+hb(s)+"</span>") :
                (c&d ? ("<span class=\"command\">"+c.toString(16)+hb(d)+"</span>"):("...")))
         );
}

function hb(n)
{
  var s=n.toString(16);
  if (s.length==1) s='0'+s;
  return s;
}

function pad(s,l)
{
  var ps=s;
  if (ps.length > l) ps=ps.substring(0,l-1);
  while (ps.length < l) ps+=" ";
  return ps;
}

function addToPlaylist(song)
{
  var a=song.split("/");
  var songtitle="";
  if (a.length > 3) {
    songtitle=a[2]+"/"+a[3];
  } else {
    songtitle=a[2];
  }
  var dupe=false;
  $("#playlist_box option").each(function(o) {
    if ($(this).val() == song) dupe=true;
  });
  if (!dupe) {
    var optclass=($("#playlist_box option").length & 1) ? "odd" : "even";
    $("#playlist_box").append("<option class=\""+optclass+"\" value=\""+song+"\">"+songtitle+"</option>");
  }
  return !dupe;
}

function refreshStoredPlaylist()
{
  if(typeof(Storage) !== "undefined") {
    var playlist=[];
    $("#playlist_box option").each(function(o) {
      playlist.push($(this).val());
    });
    localStorage["playlist"]=JSON.stringify(playlist);
  }
}

function playFromPlaylist(module, autostart)
{
  module.stopaudio();
  module.setautostart(autostart);
  $("#modtimer").html("loading");
  var loadInterval=setInterval(function(){
    if (!module.delayload) {
       window.currentModule=$("#playlist_box option:selected").val();
       window.playlistPosition=$("#playlist_box option").index($("#playlist_box option:selected"));
       window.playlistActive=true;
       module.load($("#playlist_box option:selected").val());      
       clearInterval(loadInterval);
    }
  }, 200);
}

$(document).ready(function() {
  var timer;
  var module=new Protracker();
  var oldpos=-1;

  window.currentModule=$("#modfile").val();
  window.playlistPosition=0;
  window.playlistActive=false;
  
  if(typeof(Storage) !== "undefined") {
    // read previous button states from localStorage
    if (localStorage["modrepeat"]) {
      if (localStorage["modrepeat"]=="true") {
        $("#modrepeat").addClass("down");
        module.setrepeat(true);
      } else {
        $("#modrepeat").removeClass("down");
        module.setrepeat(false);      
      }
    }
    if (localStorage["modamiga"]) {
      if (localStorage["modamiga"]=="500") {
        $("#modamiga").addClass("down");
        $("#modamiga").html("[A500]");
        module.setamigamodel("500");
      } else {
        $("#modamiga").removeClass("down");
        $("#modamiga").html("[1200]");
        module.setamigamodel("1200");
      }
    }
    if (localStorage["modclock"]) {
      if (localStorage["modclock"]=="PAL") {
        $("#modclock").addClass("down");
        $("#modclock").html("[&nbsp;PAL]");
        module.setamigatype(true);
      } else {
        $("#modclock").removeClass("down");
        $("#modclock").html("[NTSC]");
        module.setamigatype(false);
      }
    }
    if (localStorage["modpaula"]) {
      switch (parseInt(localStorage["modpaula"])) {
        case 0:
        $("#modpaula").addClass("stereo");        
        $("#modpaula").addClass("down");
        $("#modpaula").html("[))((]");    
        module.setseparation(0);
        break;
        
        case 1:
        $("#modpaula").removeClass("stereo");        
        $("#modpaula").addClass("down");
        $("#modpaula").html("[)oo(]");    
        module.setseparation(1);        
        break;
        
        case 2:
        $("#modpaula").removeClass("stereo");        
        $("#modpaula").removeClass("down");
        $("#modpaula").html("[mono]");    
        module.setseparation(2);        
        break;
      }
    }
    if (localStorage["playlist"]) {
      var playlist=JSON.parse(localStorage["playlist"]);
      for(i=0;i<playlist.length;i++) addToPlaylist(playlist[i]);
    }
  }

  module.onReady=function() {  
    $("#modtitle").html(pad(this.title, 20));
    $("#modsamples").html("");
    for(i=0;i<31;i++)
      $("#modsamples").append("<span class=\"samplelist\" id=\"sample"+hb(i+1)+"\">"+hb(i+1)+" "+pad(this.sample[i].name, 22)+"</span>\n");
    $("#modinfo").html("");
    $("#modinfo").append("('"+this.signature+"')");
    var s=window.currentModule.split("/");
    if (s.length > 3) {
      $("title").html(s[3]+" - Protracker module player for Web Audio");
      window.history.pushState("object of string", "Title", "/"+s[2]+"/"+s[3]);
    } else {
      $("title").html(s[2]+" - Protracker module player for Web Audio");
      window.history.pushState("object of string", "Title", "/"+s[2]);
    }
    
    if (window.playlistActive) {
      $("#prev_track").removeClass("inactive");
      $("#next_track").removeClass("inactive");
    } else {
      $("#prev_track").addClass("inactive");
      $("#next_track").addClass("inactive");
    }
    
    var pdata="";
    for(p=0;p<this.patterns;p++) {
      var pp, pd="<div class=\"patterndata\" id=\"pattern"+hb(p)+"\">";
      for(i=0; i<12; i++) pd+="\n";
      for(i=0; i<64; i++) {
        pp=i*4*this.channels;
        pd+="<span class=\"patternrow\" id=\"pattern"+hb(p)+"_row"+hb(i)+"\">"+hb(i)+"|";
        for(c=0;c<this.channels;c++) {
          pd+=notef(this.note[p][i*this.channels+c], (this.pattern[p][pp+0]&0xf0 | this.pattern[p][pp+2]>>4), this.pattern[p][pp+2]&0x0f, this.pattern[p][pp+3], this.channels);
          pp+=4;
        }
        pd+="</span>\n";
      }
      for(i=0; i<24; i++) pd+="\n";
      pdata+=pd+"</div>";
    }
    $("#modpattern").html(pdata);
    
    $("#modtimer").html("ready");
  };

  module.onPlay=function() {
    var oldpos=-1, oldrow=-1;
    $("#play").html("[stop]");
    timer=setInterval(function(){
      var i,c;
      var mod=module;
      if (mod.paused) return;

      if (oldpos != mod.position) {
        if (oldpos>=0) $("#pattern"+hb(mod.patterntable[oldpos])).removeClass("currentpattern");
        $("#pattern"+hb(mod.patterntable[mod.position])).addClass("currentpattern");
      }
      if (oldrow != mod.row) {
        $("#modtimer").replaceWith("<span id=\"modtimer\">"+
          "pos <span class=\"hl\">"+hb(mod.position)+"</span>/<span class=\"hl\">"+hb(mod.songlen)+"</span> "+
          "row <span class=\"hl\">"+hb(mod.row)+"</span>/<span class=\"hl\">3f</span> "+
          "speed <span class=\"hl\">"+mod.speed+"</span> "+
          "bpm <span class=\"hl\">"+mod.bpm+"</span> "+
          "filter <span class=\"hl\">"+(mod.filter ? "on" : "off")+"</span>"+
          "</span>");

        $("#modsamples").children().removeClass("activesample");      
        for(c=0;c<mod.channels;c++)
          if (mod.channel[c].noteon) $("#sample"+hb(mod.channel[c].sample+1)).addClass("activesample");
          
        if (oldpos>=0 && oldrow>=0) $("#pattern"+hb(mod.patterntable[oldpos])+"_row"+hb(oldrow)).removeClass("currentrow");
        $("#pattern"+hb(mod.patterntable[mod.position])+"_row"+hb(mod.row)).addClass("currentrow");
        $("#pattern"+hb(mod.patterntable[mod.position])).scrollTop(mod.row*16);
      }
      oldpos=mod.position;        
      oldrow=mod.row;
    }, (mobileSafari ? 80.0 : 40.0) ); // half display update speed for iOS
  };

  module.onStop=function() {
    $("#modsamples").children().removeClass("activesample");
    $("#modchannels").html("");
    $(".currentpattern").removeClass("currentpattern");
    clearInterval(timer);
    $("#modtimer").html("stopped");
    $("#play").html("[play]");

    // if in playlist mode, load next song
    if (window.playlistActive && module.endofsong) {
      var opt=$("#playlist_box option:selected");
      if (opt.length) {
        var n=$(opt).next("option");
        if (n.length) {  
          // load next track
        } else {
          // jump to first
          n=$("#playlist_box option:first");
        }
        $("#playlist_box").val($(n).val()).change();
        playFromPlaylist(module, true);
      }
    }
  };

  $("#play").click(function(){
    if (module.playing) {
      module.stop();
      return false;
    }
    module.play();
    return false;
  });

  $("#pause").click(function(){
      $("#pause").toggleClass("down");
      module.pause();
      return false;
  });
  
  $("#go_back").click(function(){
    module.jump(-1);
    return false;
  });

  $("#go_fwd").click(function(){
    module.jump(1);
    return false;
  });  
  
  $("#modrepeat").click(function(){
    $("#modrepeat").toggleClass("down");
    module.setrepeat($("#modrepeat").hasClass("down"));
    if(typeof(Storage) !== "undefined") localStorage.setItem("modrepeat", $("#modrepeat").hasClass("down"));
    return false;
  });
  
  $("#modpaula").click(function() {
    if ($("#modpaula").hasClass("down")) {
      if ($("#modpaula").hasClass("stereo")) {
        $("#modpaula").toggleClass("stereo");        
        $("#modpaula").toggleClass("down");
        // mono
        $("#modpaula").html("[mono]");    
        module.setseparation(2);
        if(typeof(Storage) !== "undefined") localStorage.setItem("modpaula", 2);
      } else {
        $("#modpaula").toggleClass("stereo");
        // amiga 100% stereo
        $("#modpaula").html("[))((]");
        module.setseparation(0);
        if(typeof(Storage) !== "undefined") localStorage.setItem("modpaula", 0);
      }
    } else {
      $("#modpaula").toggleClass("down");
      // "betterpaula" 65/35 stereo
      $("#modpaula").html("[)oo(]");
      module.setseparation(1);
      if(typeof(Storage) !== "undefined") localStorage.setItem("modpaula", 1);
    }
    return false;
  });
  
  $("#modamiga").click(function() {
    $("#modamiga").toggleClass("down");
    if ($("#modamiga").hasClass("down")) {
      $("#modamiga").html("[A500]");
      module.setamigamodel("500");
      if(typeof(Storage) !== "undefined") localStorage.setItem("modamiga", "500");
    } else {
      $("#modamiga").html("[1200]");    
      module.setamigamodel("1200");      
      if(typeof(Storage) !== "undefined") localStorage.setItem("modamiga", "1200");
    }  
  });

  $("#modclock").click(function() {
    $("#modclock").toggleClass("down");
    if ($("#modclock").hasClass("down")) {
      $("#modclock").html("[&nbsp;PAL]");
      module.setamigatype(true);
      if(typeof(Storage) !== "undefined") localStorage.setItem("modclock", "PAL");
    } else {
      $("#modclock").html("[NTSC]");    
      module.setamigatype(false);      
      if(typeof(Storage) !== "undefined") localStorage.setItem("modclock", "NTSC");
    }
    return false;
  });

  $("#load_song").click(function(){
    $("#loadercontainer").show();
    $("#innercontainer").hide();
    $("#modfile").focus();
    var s=document.getElementById("modfile");
    var i=s.selectedIndex;
    s[i].selected=false;
    s[(i<(s.length-4))?(i+4):(s.length-1)].selected=true;
    s[i].selected=true;
    return false;
  });

  $("#loadercontainer").click(function(){
    return false;
  });

  $("#load").click(function(){
    if (module.playing) {
      module.stop();
      module.setautostart(true);
    } else {
      module.setautostart(false);
    }
    $("#modtimer").html("loading");
    $("#loadercontainer").hide();
    $("#innercontainer").show();
    var loadInterval=setInterval(function(){
      if (!module.delayload) {
         window.currentModule=$("#modfile").val();
         window.playlistActive=false;
         module.load($("#modfile").val());
         clearInterval(loadInterval);
      }
    }, 200);
    return false;
  });
  
  $("#load_cancel").click(function(){
    $("#loadercontainer").hide();
    $("#innercontainer").show();
    return false;
  });
  
  $("#add_playlist").click(function(){
    var song=$("#modfile").val();
    if (addToPlaylist(song)) refreshStoredPlaylist();
    return false;
  });

  $("#modfile option").dblclick(function() {
    $("#load").click();
  });
  
  $("#modfile").keypress(function(event) {
    if (event.keyCode==13) $("#load").click();
  });

  if ($("#modfile").val()!="") module.load($("#modfile").val());
  
  $("#playlist_remove").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      var song=opt.val();
      opt.remove();
      refreshStoredPlaylist();
    }
    return false;
  });

  $("#playlist_clear").click(function(){
    $("#playlist_box").html("");
    refreshStoredPlaylist();
    return false;
  });
  
  $("#playlist_jumpto").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      if (module.playing) module.stop();
      module.setautostart(true);
      $("#modtimer").html("loading");
      $("#loadercontainer").hide();
      $("#innercontainer").show();
      var loadInterval=setInterval(function(){
        if (!module.delayload) {
           window.currentModule=$("#playlist_box option:selected").val();
           window.playlistPosition=$("#playlist_box option").index($("#playlist_box option:selected"));
           window.playlistActive=true;
           module.load($("#playlist_box option:selected").val());      
           clearInterval(loadInterval);
        }
      }, 200);
    }
    return false;
  });
  
  $("#playlist_box option").dblclick(function() {
    $("#playlist_jumpto").click();
  });  
  
  $("#playlist_up").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      var p=$(opt).prev("option");
      if (p.length) {
        var v=$(p).val();
        var t=$(p).html();
        $(p).html($(opt).html());
        $(p).val($(opt).val());
        $(opt).html(t);
        $(opt).val(v);
        $("#playlist_box").val($(p).val()).change();
      }
      refreshStoredPlaylist();
    }
    return false;
  });

  $("#playlist_dn").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      var n=$(opt).next("option");
      if (n.length) {
        var v=$(n).val();
        var t=$(n).html();
        $(n).html($(opt).html());
        $(n).val($(opt).val());
        $(opt).html(t);
        $(opt).val(v);
        $("#playlist_box").val($(n).val()).change();
      }
      refreshStoredPlaylist();
    }
    return false;
  });
  
  $("#next_track").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      var n=$(opt).next("option");
      if (n.length) {  
        // load next track
      } else {
        // jump to first
        n=$("#playlist_box option:first");
      }
      $("#playlist_box").val($(n).val()).change();
      playFromPlaylist(module, module.playing);
    }
    return false;
  });
  
  $("#prev_track").click(function(){
    var opt=$("#playlist_box option:selected");
    if (opt.length) {
      var p=$(opt).prev("option");
      if (p.length) {
        // load previous track
      } else {
        // jump to last
        p=$("#playlist_box option:last");        
      }
      $("#playlist_box").val($(p).val()).change();      
      playFromPlaylist(module, module.playing);
    }
    return false;
  });
  
  $(document).keypress(function(ev){
    if (ev.keyCode==32) {
      if ($("#innercontainer").is(":visible")) {
        if (module.playing) {
          $("#pause").click();
        } else {
          $("#play").click();
        }
        event.preventDefault();
        return false;
      }
    }
  });
    
});
