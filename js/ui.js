/*
  user interface stuff for the web audio module player
  (c) 2012-2013 firehawk/tda
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

$(document).ready(function() {
  var timer;
  var module=new Protracker();
  var oldpos=-1;

  module.onReady=function() {  
    $("#modtitle").html(pad(this.title, 20));
    $("#modsamples").html("");
    for(i=0;i<31;i++)
      $("#modsamples").append("<span class=\"samplelist\" id=\"sample"+hb(i+1)+"\">"+hb(i+1)+" "+pad(this.sample[i].name, 22)+"</span>\n");
    $("#modinfo").html("");
    $("#modinfo").append("('"+this.signature+"')");
    var s=$("#modfile").val().split("/");
    $("title").html(s[3]+" - Protracker module player for Web Audio");
    window.history.pushState("object of string", "Title", "/"+s[2]+"/"+s[3]);
    
    var pdata="";
    for(p=0;p<this.patterns;p++) {
      var pp, pd="<div class=\"patterndata pattern"+hb(p)+"\">";
      for(i=0; i<12; i++) pd+="\n";
      for(i=0; i<64; i++) {
        pp=i*4*this.channels;
        pd+="<span class=\"patternrow\">"+hb(i)+"|";
        for(c=0;c<this.channels;c++) {
          pd+=notef(this.note[p][i*this.channels+c], (this.pattern[p][pp+0]&0xf0 | this.pattern[p][pp+2]>>4), this.pattern[p][pp+2]&0x0f, this.pattern[p][pp+3], this.channels);
          pp+=4;
        }
        pd+="</span>\n";
      }
      for(i=0; i<24; i++) pd+="\n";
      pdata+=pd+"</div>";
    }
    if (!mobileSafari) {
      $("#modpattern").html(pdata);
    } else {
      $("#modpattern").html("(Pattern display is disabled on iOS)");
    }
    
    $("#modtimer").html("ready");
  };

  module.onPlay=function() {
    oldpos=-1;
    $("#play").html("[stop]");
    timer=setInterval(function(){
      var i,c;
      var mod=module;
      if (mod.paused) return;

      $("#modtimer").replaceWith("<span id=\"modtimer\">"+
        "pos <span class=\"hl\">"+hb(mod.position)+"</span>/<span class=\"hl\">"+hb(mod.songlen)+"</span> "+
        "row <span class=\"hl\">"+hb(mod.row)+"</span>/<span class=\"hl\">3f</span> "+
        "speed <span class=\"hl\">"+mod.speed+"</span> "+
        "bpm <span class=\"hl\">"+mod.bpm+"</span>"+
        "</span>");

      $("#modsamples").children().removeClass("activesample");
      for(c=0;c<mod.channels;c++)
        if (mod.channel[c].noteon) $("span#sample"+hb(mod.channel[c].sample+1)).addClass("activesample");

      if (!mobileSafari) {
        if (oldpos != mod.position) {
          $(".currentpattern").removeClass("currentpattern");
          $(".pattern"+hb(mod.patterntable[mod.position])).addClass("currentpattern");
        }
        oldpos=mod.position;
        $(".currentrow").removeClass("currentrow");
        $(".currentpattern .patternrow:eq("+mod.row+")").addClass("currentrow");
        $(".currentpattern").scrollTop( mod.row * 16);
      }
    }, 40.0);
  };

  module.onStop=function() {
    clearInterval(timer);
    $("#modtimer").html("stopped");
    $("#modsamples").children().removeClass("activesample");
    $("#modchannels").html("");
    $("#modpattern").html("");    
    $("#play").html("[play]");
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
    return false;
  });
  
  $("#modpaula").click(function() {
    $("#modpaula").toggleClass("down");
    if ($("#modpaula").hasClass("down")) {
      $("#modpaula").html("[)oo(]");
      module.setseparation(true);
    } else {
      $("#modpaula").html("[))((]");    
      module.setseparation(false);
    }
    return false;
  });

  $("#modclock").click(function() {
    $("#modclock").toggleClass("down");
    if ($("#modclock").hasClass("down")) {
      $("#modclock").html("[&nbsp;PAL]");
      module.setamigatype(true);
    } else {
      $("#modclock").html("[NTSC]");    
      module.setamigatype(false);      
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
    module.load($("#modfile").val());
    $("#loadercontainer").hide();
    $("#innercontainer").show();
    return false;
  });
  
  $("#load_cancel").click(function(){
    $("#loadercontainer").hide();
    $("#innercontainer").show();
    return false;
  });

  $("#modfile option").dblclick(function() {
    $("#load").click();
  });
  
  $("#modfile").keypress(function(event) {
    if (event.keyCode==13) $("#load").click();
  });

  if ($("#modfile").val()!="") module.load($("#modfile").val());
});
