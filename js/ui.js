/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  User interface code
*/

var notelist=new Array("C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-");

var ft2volcmds=new Array("m", "v", "^", "-", "+", "s", "~", "p", "&lt;", "&gt;"); // 0x5 .. 0xe

function notef(n,s,v,c,d,cc)
{
  function prn(n) { return (n==254)?"===":("<span class=\"note\">"+notelist[n&0x0f]+(n>>4)+"</span>"); }
  function prv(v) { return (v<=0x40)?hb(v):(ft2volcmds[(v-0x50)>>4]+hn(v&0x0f)); }

  // 14 chars per channel (max 112)
  if (cc<=8) return ((n<255) ? (prn(n)+" ") : ("... "))+
    (s ? ("<span class=\"sample\">"+hb(s)+"</span> ") : (".. "))+
    ( (v!=255)?("<span class=\"volume\">"+prv(v)+"</span> "):(".. "))+
    ((c!=0x2e) ? ("<span class=\"command\">"+String.fromCharCode(c)+hb(d)+"</span>") : "...")+
    "|";

  // 11 chars (max 110)
  if (cc<=10) return ((n<255) ? prn(n) : ("..."))+
    (s ? ("<span class=\"sample\">"+hb(s)+"</span>") : (".."))+
    ( (v!=255)?("<span class=\"volume\">"+prv(v)+"</span>"):(".."))+
    ((c!=0x2e) ? ("<span class=\"command\">"+String.fromCharCode(c)+hb(d)+"</span>") : "...")+
    "|";

  // 9 chars (max 108)
  if (cc<=12) return ((n<255) ? prn(n) : ("..."))+
    (s ? ("<span class=\"sample\">"+hb(s)+"</span>") :
    ((v!=255)?("<span class=\"volume\">"+prv(v)+"</span>"):("..")))+
    ((c!=0x2e) ? ("<span class=\"command\">"+String.fromCharCode(c)+hb(d)+"</span>") : "...")+
    "|";

  // 7 chars (max 112)
  if (cc<=16) return ((n<255) ? prn(n) : ("..."))+
    ((c!=0x2e) ? ("<span class=\"command\">"+String.fromCharCode(c)+hb(d)+"</span>") :
    ( s ? ("<span class=\"sample\">"+hb(s)+"</span>.") : ( (v!=255)?("<span class=\"volume\">"+prv(v)+"</span>."):("...")))
    )+"|";

  // 3 chars (max 96)
  return ((n<255) ? prn(n) :
    (s ? (".<span class=\"sample\">"+hb(s)+"</span>") :
    ((c!=0x2e) ? ("<span class=\"command\">"+String.fromCharCode(c)+hb(d)+"</span>") :
    ((v!=255) ? (" <span class=\"volume\">"+prv(v)+"</span>"):("...")))));
}

function hn(n)
{
  if (typeof n == "undefined") return "0";
  var s=(n&0x0f).toString(16);
  return s.toUpperCase();
}

function hb(n)
{
  if (typeof n == "undefined") return "00";
  var s=n.toString(16);
  if (s.length==1) s='0'+s;
  return s.toUpperCase();
}

function hw(n)
{
  if (typeof n == "undefined") return "0000";
  var s=n.toString(16);
  if (s.length==3) s='0'+s;
  else if (s.length==2) s='00'+s;
  else if (s.length==1) s='000'+s;
  return s.toUpperCase();
}

function pad(s,l)
{
  var ps=s;
  if (ps.length > l) ps=ps.substring(0,l-1);
  while (ps.length < l) ps+=" ";
  return ps;
}

function rpe(s)
{
  var rs="";
  for(var i=0;i<s.length;i++) {
    if (s[i]=='>') rs+="&gt;"
    else if (s[i]=='<') rs+='&lt';
    else if (s[i]=='&') rs+='&amp;';
    else rs+=s[i];
  }
  return rs;
}

function vu(l)
{
  var f=Math.round(l*20);
  var b="";

  b='<span style="color:#afa;">';
  for(i=0;i<10;i++) b+=(i<f)?"&#x00BB;":"&nbsp;";
  b+='</span><span style="color:#fea;">';
  for(;i<16;i++) b+=(i<f)?"&#x00BB;":"&nbsp;";
  b+='</span><span style="color:#faa;">';
  for(;i<20;i++) b+=(i<f)?"&#x00BB;":"&nbsp;";
  b+='</span>';

  return b;
}

function showLoaderInfo(module)
{
  window.loaderInterval=setInterval(function(){
    if (module.loading) {
      $("#modtimer").html(module.state);
    } else {
      clearInterval(window.loaderInterval);
    }
  }, 20);
}

function addToPlaylist(song)
{
  var dupe=false;
  $("#playlist_box option").each(function(o) {
    if ($(this).val() == song) dupe=true;
  });
  if (!dupe) {
    var optclass=($("#playlist_box option").length & 1) ? "odd" : "even";
    $("#playlist_box").append("<option class=\""+optclass+"\" value=\""+song+"\">"+song+"</option>");
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
  oldpos=-1;
  var loadInterval=setInterval(function(){
    if (!module.delayload) {
       window.currentModule=$("#playlist_box option:selected").val();
       window.playlistPosition=$("#playlist_box option").index($("#playlist_box option:selected"));
       window.playlistActive=true;
       module.load(musicPath+$("#playlist_box option:selected").val());
       clearInterval(loadInterval);
       showLoaderInfo(module);
    }
  }, 200);
}

function updateSelectBox(e)
{
  var i, j, f, o="";

  var filter=$("#loadfilter").val().toLowerCase();
  for(i=0;i<window.musicLibrary.length;i++) {
    og=""; f=0;
    if (window.musicLibrary[i].composer=="Unknown") {
      og+='<optgroup class="'+((i&1)?"odd":"even")+'" label="'+window.musicLibrary[i].composer+'">';
      for(j=0;j<window.musicLibrary[i].songs.length;j++) {
        if (filter=="" || window.musicLibrary[i].songs[j].file.toLowerCase().indexOf(filter)>=0) {
          og+='<option class="'+((i&1)?"odd":"even")+'" value="'+
            window.musicLibrary[i].songs[j].file+'">'+window.musicLibrary[i].songs[j].file+' '+
            '<span class="filesize">('+window.musicLibrary[i].songs[j].size+' bytes)</span></option>';
          f++;
        }
      }
      og+='</optgroup>';
    } else {
      og+='<optgroup class="'+((i&1)?"odd":"even")+'" label="'+window.musicLibrary[i].composer+'">';
      for(j=0;j<window.musicLibrary[i].songs.length;j++) {
        if (filter=="" ||
           window.musicLibrary[i].composer.toLowerCase().indexOf(filter)>=0 ||
           window.musicLibrary[i].songs[j].file.toLowerCase().indexOf(filter)>=0) {
          og+='<option class="'+((i&1)?"odd":"even")+'" value="'+window.musicLibrary[i].composer+'/'+
            window.musicLibrary[i].songs[j].file+'">'+window.musicLibrary[i].songs[j].file+' '+
            '<span class="filesize">('+window.musicLibrary[i].songs[j].size+' bytes)</span></option>';
          f++;
        }
      }
      og+='</optgroup>';
    }
    if (f) o+=og;
  }
  $("#modfile").html(o);
  $("#modfile option").dblclick(function() {
    $("#load").click();
  });
}

function setVisualization(mod, v)
{
  var visNames=["[none]", "[trks]", "[chvu]"];
  switch (v) {
    case 0:
      $("#modvis").removeClass("down");
      $(".currentpattern").removeClass("currentpattern");
      $("#modchannels").hide();
      break;

    case 1:
      $("#modvis").addClass("down");
      if (mod && mod.playing) $("#pattern"+hb(mod.currentpattern())).addClass("currentpattern");
      $("#modchannels").hide();
      break;

    case 2:
      $("#modvis").addClass("down");
      $(".currentpattern").removeClass("currentpattern");
      $("#modchannels").show();
      break;
  }
  $("#modvis").html(visNames[v]);
  window.moduleVis=v;
}


var oldpos=-1, oldrow=-1;

var lastframe=-1;
function updateUI(timestamp)
{
  // maintain 25hz frame rate for the UI
  if ((timestamp-lastframe) < 40) {
    requestAnimationFrame(updateUI);
    return;
  }
  lastframe=timestamp;

  var i,c;
  var mod=window.module;

  if (mod.playing) {
    if (window.moduleVis==2) {
      var txt, txt0="<br/>", txt1="<br/>";
      for(ch=0;ch<mod.channels;ch++) {
        txt='<span class="channelnr">'+hb(ch)+'</span> ['+vu(mod.chvu[ch])+'] '+
            '<span class="hl">'+hb(mod.currentsample(ch))+'</span>:<span class="channelsample">'+rpe(pad(mod.samplenames[mod.currentsample(ch)], 28))+"</span><br/>";
        if (ch&1) txt0+=txt; else txt1+=txt;
      }
      $("#even-channels").html(txt0);
      $("#odd-channels").html(txt1);
    } else if (window.moduleVis==1) {
      if (oldpos>=0 && oldrow>=0) $(".currentrow").removeClass("currentrow");
      $("#pattern"+hb(mod.position)+"_row"+hb(mod.row)).addClass("currentrow");
      $("#pattern"+hb(mod.position)).scrollTop(mod.row*16);
      if (oldpos != mod.position) {
        if (oldpos>=0) $(".currentpattern").removeClass("currentpattern");
        $("#pattern"+hb(mod.position)).addClass("currentpattern");
      }
    }

    if (oldrow != mod.row || oldpos != mod.position) {
      $("#modtimer").replaceWith("<span id=\"modtimer\">"+
        "pos <span class=\"hl\">"+hb(mod.position)+"</span>/<span class=\"hl\">"+hb(mod.songlen)+"</span> "+
        "row <span class=\"hl\">"+hb(mod.row)+"</span>/<span class=\"hl\">"+hb(mod.currentpattlen()-1)+"</span> "+
        "speed <span class=\"hl\">"+mod.speed+"</span> "+
        "bpm <span class=\"hl\">"+mod.bpm+"</span> "+
        "filter <span class=\"hl\">"+(mod.filter ? "on" : "off")+"</span>"+
        "</span>");

      $("#modsamples").children().removeClass("activesample");
      for(c=0;c<mod.channels;c++)
        if (mod.noteon(c)) $("#sample"+hb(mod.currentsample(c)+1)).addClass("activesample");
    }
    oldpos=mod.position;
    oldrow=mod.row;
  }
  requestAnimationFrame(updateUI);
}


$(document).ready(function() {
  window.module=new Modplayer();
  window.playlistPosition=0;
  window.playlistActive=false;

  if (mobileSafari) {
    setVisualization(null, 0);
  } else {
    setVisualization(null, 1);
  }

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
        module.setamigamodel("500");
      } else {
        $("#modamiga").removeClass("down");
        module.setamigamodel("1200");
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
    if (localStorage["modvis"])
      setVisualization(null, parseInt(localStorage["modvis"]));
  }

  module.onReady=function() {
    $("#modtitle").html(rpe(pad(this.title, 28)));
    $("#modsamples").html("");
    for(i=0;i<31;i++)
      $("#modsamples").append("<span class=\"samplelist\" id=\"sample"+hb(i+1)+"\">"+hb(i+1)+" "+rpe(pad(this.samplenames[i], 28))+"</span>\n");
    $("#modinfo").html("");
    $("#modinfo").append("('"+this.signature+"')");
    var s=window.currentModule.split("/");
    if (s.length > 1) {
      $("title").html(s[1]+" - module player for Web Audio");
      if (window.location.protocol !== "file:")
        window.history.pushState("object of string", "Title", "/"+s[0]+"/"+s[1]);
    } else {
      $("title").html(s[0]+" - module player for Web Audio");
      if (window.location.protocol !== "file:")
        window.history.pushState("object of string", "Title", "/"+s[0]);
    }

    if (window.playlistActive) {
      $("#prev_track").removeClass("inactive");
      $("#next_track").removeClass("inactive");
    } else {
      $("#prev_track").addClass("inactive");
      $("#next_track").addClass("inactive");
    }

    var pd="";
    for(p=0;p<this.songlen;p++) {
      var pp, pdata;
      pd+="<div class=\"patterndata\" id=\"pattern"+hb(p)+"\">";
      for(i=0; i<12; i++) pd+="\n";
      pdata=this.patterndata(p);
      for(i=0; i<(pdata.length/(5*this.channels)); i++) {
        pp=i*5*this.channels;
        pd+="<span class=\"patternrow\" id=\"pattern"+hb(p)+"_row"+hb(i)+"\">"+hb(i)+"|";
        for(c=0;c<this.channels;c++) {
          pd+=notef(pdata[pp+c*5+0], pdata[pp+c*5+1], pdata[pp+c*5+2], pdata[pp+c*5+3], pdata[pp+c*5+4], this.channels);
        }
        pd+="</span>\n";
      }
      for(i=0; i<24; i++) pd+="\n";
      pd+="</div>";
    }
    $("#modpattern").html(pd);
    $("#modtimer").html("ready.");
  };

  module.onPlay=function() {
    $("#play").html("[stop]");
    if (!this.paused) $("#pause").removeClass("down");
    requestAnimationFrame(updateUI);
  };

  module.onStop=function() {
    $("#modsamples").children().removeClass("activesample");
    $("#even-channels").html("");
    $("#odd-channels").html("");
    $(".currentpattern").removeClass("currentpattern");
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
      $("#pause").removeClass("down");
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
        // normal stereo
        $("#modpaula").html("[))((]");
        module.setseparation(0);
        if(typeof(Storage) !== "undefined") localStorage.setItem("modpaula", 0);
      }
    } else {
      $("#modpaula").toggleClass("down");
      // narrow stereo
      $("#modpaula").html("[)oo(]");
      module.setseparation(1);
      if(typeof(Storage) !== "undefined") localStorage.setItem("modpaula", 1);
    }
    return false;
  });

  $("#modvis").click(function() {
    var v=(window.moduleVis+1)%3;
    setVisualization(module, v);
    if(typeof(Storage) !== "undefined") localStorage.setItem("modvis", v);
    return false;
  });

  $("#modamiga").click(function() {
    $("#modamiga").toggleClass("down");
    if ($("#modamiga").hasClass("down")) {
      module.setamigamodel("500");
      if(typeof(Storage) !== "undefined") localStorage.setItem("modamiga", "500");
    } else {
      module.setamigamodel("1200");
      if(typeof(Storage) !== "undefined") localStorage.setItem("modamiga", "1200");
    }
  });

  $("#load_song").click(function(){
    $("#loadercontainer").show();
    $("#innercontainer").hide();
    $("#modfile").focus();
    var s=document.getElementById("modfile");
    var i=s.selectedIndex;
    if (!s[i]) return;
    s[i].selected=false;
    s[(i<(s.length-12))?(i+12):(s.length-1)].selected=true;
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
    oldpos=-1;
    $("#loadercontainer").hide();
    $("#innercontainer").show();
    var loadInterval=setInterval(function(){
      if (!module.delayload) {
         window.currentModule=$("#modfile").val();
         window.playlistActive=false;
         module.load(musicPath+$("#modfile").val());
         clearInterval(loadInterval);
         showLoaderInfo(module);
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

  $("#modfile").keypress(function(event) {
    if (event.keyCode==13) $("#load").click();
  });

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
      oldpos=-1;
      module.setautostart(true);
      $("#loadercontainer").hide();
      $("#innercontainer").show();
      var loadInterval=setInterval(function(){
        if (!module.delayload) {
           window.currentModule=$("#playlist_box option:selected").val();
           window.playlistPosition=$("#playlist_box option").index($("#playlist_box option:selected"));
           window.playlistActive=true;
           module.load(musicPath+$("#playlist_box option:selected").val());
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

  $("#loadfilter").on("input", updateSelectBox);

  $(document).keyup(function(ev){
    // keyboard shortcuts for main player screen
    if ($("#innercontainer").is(":visible")) {
      if (ev.keyCode==32) { // start/pause playback with space
        if (module.playing) {
          $("#pause").click();
        } else {
          $("#play").click();
        }
        event.preventDefault(); return false;
      }
      if (ev.keyCode==76) { // 'L' to open loading screen
        $("#load_song").click();
        event.preventDefault(); return false;
      }
      if (ev.keyCode==37) { // left to jump to previous order
        $("#go_back").click();
        event.preventDefault(); return false;
      }
      if (ev.keyCode==39) { // right to jump to next order
        $("#go_fwd").click();
        event.preventDefault(); return false;
      }
    }

    // keyboard shortcuts for load/playlist screen
    if ($("#loadercontainer").is(":visible")) {
      if (ev.keyCode==27) {
        $("#load_cancel").click();
        event.preventDefault(); return false;
      }
    }
  });

  // all done, load the song library and default module
  var request = new XMLHttpRequest();
  request.open("GET", "/music_library.json", true);
  request.responseType = "json";
  request.onload = function() {
    window.musicLibrary=eval(request.response);
    updateSelectBox(null);

    if (window.defaultComposer != "") {
      $("#loadfilter").val(window.defaultComposer);
      updateSelectBox(null);
      $("#modfile optgroup[label='"+window.defaultComposer+"'] > option:first").attr('selected', 'selected');
      $("#load_song").click();
    } else {
      $('#modfile option[value="'+window.currentModule+'"]').attr('selected', 'selected');
      if ($("#modfile").val()!="") {
        var loadInterval=setInterval(function(){
          if (!module.delayload) {
             window.currentModule=$("#modfile").val();
             window.playlistActive=false;
             module.load(musicPath+$("#modfile").val());
             clearInterval(loadInterval);
             showLoaderInfo(module);
          }
        }, 200);
      }
    }
  }
  request.send();
});
