/*
suparhyparexperimental s3m player - (c) firehawk/tda

features:
- software mixing with wide dynamic range
- soft clipping of audio peaks
- 32-bit floating point sample interpolation
- ultraclick(tm) mitigation with volume ramps
- supports most ST3 effects and quirks
- runs in a frickin' web browser! wtf?!? works
  on safari, edge and chrome. maybe firefox, too.

todo:
- work harder to remove more ultraclicks(tm)
- optimize things. you know. things.
- fix crash at pos 54 (0x36) in dune's control-e
- are Exx, Fxx and Gxx supposed to share the
  command data memory? need to test this.

*/

function Screamtracker()
{
  var i, t;

  this.clearsong();
  this.initialize();

  this.playing=false;
  this.paused=false;
  this.repeat=false;

  this.separation=0;
  this.filter=false;

  this.syncqueue=[];

  this.vu=new Float32Array(2);
  this.vu[0]=0.0;
  this.vu[1]=0.0;

  this.samplerate=44100;
  this.ramplen=64.0;

  this.periodtable=new Float32Array([
    27392.0, 25856.0, 24384.0, 23040.0, 21696.0, 20480.0, 19328.0, 18240.0, 17216.0, 16256.0, 15360.0, 14496.0, 
    13696.0, 12928.0, 12192.0, 11520.0, 10848.0, 10240.0,  9664.0,  9120.0,  8608.0,  8128.0,  7680.0,  7248.0, 
     6848.0,  6464.0,  6096.0,  5760.0,  5424.0,  5120.0,  4832.0,  4560.0,  4304.0,  4064.0,  3840.0,  3624.0, 
     3424.0,  3232.0,  3048.0,  2880.0,  2712.0,  2560.0,  2416.0,  2280.0,  2152.0,  2032.0,  1920.0,  1812.0, 
     1712.0,  1616.0,  1524.0,  1440.0,  1356.0,  1280.0,  1208.0,  1140.0,  1076.0,  1016.0,   960.0,   906.0, 
      856.0,   808.0,   762.0,   720.0,   678.0,   640.0,   604.0,   570.0,   538.0,   508.0,   480.0,   453.0, 
      428.0,   404.0,   381.0,   360.0,   339.0,   320.0,   302.0,   285.0,   269.0,   254.0,   240.0,   226.0, 
      214.0,   202.0,   190.0,   180.0,   170.0,   160.0,   151.0,   143.0,   135.0,   127.0,   120.0,   113.0, 
      107.0,   101.0,    95.0,    90.0,    85.0,    80.0,    75.0,    71.0,    67.0,    63.0,    60.0,    56.0
  ]);

  this.retrigvoltab=new Float32Array([0, -1, -2, -4, -8, -16, .66, .5, 1, 2, 4, 8, 16, 1.5, 2]);
  
  this.pan_r=new Float32Array(32);
  this.pan_l=new Float32Array(32);
  for(i=0;i<32;i++) { this.pan_r[i]=0.5; this.pan_l[i]=0.5; }

  // calc tables for vibrato waveforms
  this.vibratotable=new Array();
  for(t=0;t<4;t++) {
    this.vibratotable[t]=new Float32Array(256);
    for(i=0;i<256;i++) {
      switch(t) {
        case 0:
          this.vibratotable[t][i]=127*Math.sin(Math.PI*2*(i/256));
          break;
        case 1:
          this.vibratotable[t][i]=127-i;
          break;
        case 2:
          this.vibratotable[t][i]=(i<128)?127:-128;
          break;
        case 3:
          this.vibratotable[t][i]=Math.random()*255-128;
          break;
      }
    }
  }

  // effect jumptables for tick 0 and tick 1+
  this.effects_t0 = new Array(
    function(mod, ch) {}, // zero is ignored
    this.effect_t0_a, this.effect_t0_b, this.effect_t0_c, this.effect_t0_d, this.effect_t0_e,
    this.effect_t0_f, this.effect_t0_g, this.effect_t0_h, this.effect_t0_i, this.effect_t0_j,
    this.effect_t0_k, this.effect_t0_l, this.effect_t0_m, this.effect_t0_n, this.effect_t0_o,
    this.effect_t0_p, this.effect_t0_q, this.effect_t0_r, this.effect_t0_s, this.effect_t0_t,
    this.effect_t0_u, this.effect_t0_v, this.effect_t0_w, this.effect_t0_x, this.effect_t0_y,
    this.effect_t0_z
  );
  this.effects_t0_s = new Array(
    this.effect_t0_s0, this.effect_t0_s1, this.effect_t0_s2, this.effect_t0_s3, this.effect_t0_s4,
    this.effect_t0_s5, this.effect_t0_s6, this.effect_t0_s7, this.effect_t0_s8, this.effect_t0_s9,
    this.effect_t0_sa, this.effect_t0_sb, this.effect_t0_sc, this.effect_t0_sd, this.effect_t0_se,
    this.effect_t0_sf
  );
  this.effects_t1 = new Array(
    function(mod, ch) {}, // zero is ignored
    this.effect_t1_a, this.effect_t1_b, this.effect_t1_c, this.effect_t1_d, this.effect_t1_e,
    this.effect_t1_f, this.effect_t1_g, this.effect_t1_h, this.effect_t1_i, this.effect_t1_j,
    this.effect_t1_k, this.effect_t1_l, this.effect_t1_m, this.effect_t1_n, this.effect_t1_o,
    this.effect_t1_p, this.effect_t1_q, this.effect_t1_r, this.effect_t1_s, this.effect_t1_t,
    this.effect_t1_u, this.effect_t1_v, this.effect_t1_w, this.effect_t1_x, this.effect_t1_y,
    this.effect_t1_z
  );
  this.effects_t1_s = new Array(
    this.effect_t1_s0, this.effect_t1_s1, this.effect_t1_s2, this.effect_t1_s3, this.effect_t1_s4,
    this.effect_t1_s5, this.effect_t1_s6, this.effect_t1_s7, this.effect_t1_s8, this.effect_t1_s9,
    this.effect_t1_sa, this.effect_t1_sb, this.effect_t1_sc, this.effect_t1_sd, this.effect_t1_se,
    this.effect_t1_sf
  );
}



// clear song data
Screamtracker.prototype.clearsong = function()
{  
  var i;

  this.title="";
  this.signature="";

  this.songlen=1;
  this.repeatpos=0;
  this.patterntable=new ArrayBuffer(256);
  for(i=0;i<256;i++) this.patterntable[i]=0;

  this.channels=0;
  this.ordNum=0;
  this.insNum=0;
  this.patNum=0;

  this.globalVol=64;
  this.initSpeed=6;
  this.initBPM=125;
  
  this.fastslide=0;
  
  this.mixval=8.0;
  
  this.sample=new Array();
  for(i=0;i<255;i++) {
    this.sample[i]=new Object();
    this.sample[i].length=0;
    this.sample[i].loopstart=0;
    this.sample[i].loopend=0;
    this.sample[i].volume=64;
    this.sample[i].loop=0;
    this.sample[i].c2spd=8363;
    this.sample[i].name="";
    this.sample[i].data=0;
  }
  
  this.pattern=new Array();
  
  this.looprow=0;
  this.loopstart=0;
  this.loopcount=0;
  
  this.patterndelay=0;
  this.patternwait=0;
}


// initialize all player variables to defaults prior to starting playback
Screamtracker.prototype.initialize = function()
{
  this.syncqueue=[];

  this.tick=0;
  this.position=0;
  this.row=0;
  this.offset=0;
  this.flags=0;

  this.volume=this.globalVol;
  this.speed=this.initSpeed;
  this.bpm=this.initBPM;
  this.breakrow=0;
  this.patternjump=0;
  this.patterndelay=0;
  this.patternwait=0;
  this.endofsong=false;
  
  this.channel=new Array();
  for(i=0;i<this.channels;i++) {
    this.channel[i]=new Object();
    this.channel[i].sample=0;
    this.channel[i].note=24;    
    this.channel[i].command=0;
    this.channel[i].data=0;
    this.channel[i].samplepos=0;
    this.channel[i].samplespeed=0;
    this.channel[i].flags=0;
    this.channel[i].noteon=0;

    this.channel[i].slidespeed=0;
    this.channel[i].slideto=0;
    this.channel[i].slidetospeed=0;
    this.channel[i].arpeggio=0;

    this.channel[i].period=0;
    this.channel[i].volume=64;
    this.channel[i].voiceperiod=0;
    this.channel[i].voicevolume=0;

    this.channel[i].semitone=12;
    this.channel[i].vibratospeed=0
    this.channel[i].vibratodepth=0
    this.channel[i].vibratopos=0;
    this.channel[i].vibratowave=0;
    
    this.channel[i].volramp=0;
    this.channel[i].volrampfrom=0;
  }
}



// parse the module from local buffer
Screamtracker.prototype.parse = function(buffer)
{
  var i,j,c;
  
  if (!buffer) return false;

  // check s3m signature and type
  for(i=0;i<4;i++) this.signature+=String.fromCharCode(buffer[0x002c+i]);
  if (this.signature != "SCRM") return false;
  if (buffer[0x001d] != 0x10) return false;

  // default panning 3/C/3/...
  for(this.channels=0,i=0;i<32;i++) {
    if (buffer[0x0040+i] != 0xff) {
      c=buffer[0x0040+i]&15;
      if (c<8) {
        this.pan_r[i]=0.2;
        this.pan_l[i]=0.8;
      } else {
        this.pan_r[i]=0.8;
        this.pan_l[i]=0.2;
      }
      this.channels++;
    }
  }
  
  i=0;
  while(buffer[i] && i<0x1c)
    this.title+=String.fromCharCode(buffer[i++]);

  this.ordNum=buffer[0x0020]|(buffer[0x0021]<<8);
  this.insNum=buffer[0x0022]|(buffer[0x0023]<<8);
  this.patNum=buffer[0x0024]|(buffer[0x0025]<<8);

  this.globalVol=buffer[0x0030];
  this.initSpeed=buffer[0x0031];
  this.initBPM=buffer[0x0032];
  
  this.fastslide=(buffer[0x0026]&64)?1:0;
  
  this.speed=this.initSpeed;
  this.bpm=this.initBPM;

  // check for additional panning info
  if (buffer[0x0035]==0xfc) {
    for(i=0;i<32;i++) {
      c=buffer[0x0070+this.ordNum+this.insNum*2+this.patNum*2+i];
      if (c&0x10) {
        c&=0x0f;
        this.pan_r[i]=(c/15.0)
        this.pan_l[i]=1.0-this.pan_r[i];
      }
    }
  }
  
  // check for mono panning
  this.mixval=buffer[0x0033];
  if ((this.mixval&0x80)==0x80) {
    for(i=0;i<32;i++) {
      this.pan_r[i]=0.5;
      this.pan_l[i]=0.5;
    }
  }
  
  // calculate master mix scaling factor
  this.mixval=128.0/Math.max(0x10, this.mixval&0x7f); // (8.0 when mastervol is 0x10, 1.0 when mastervol is 0x7f)

  // load orders
  for(i=0;i<this.ordNum;i++) this.patterntable[i]=buffer[0x0060+i];
  for(this.songlen=0,i=0;i<this.ordNum;i++) if (this.patterntable[i]!=255) this.songlen++;

  // load instruments
  this.sample=new Array(this.insNum);
  for(i=0;i<this.insNum;i++) {
    this.sample[i]=new Object();
    
    var offset=(buffer[0x0060 + this.ordNum + i*2]|buffer[0x0060 + this.ordNum + i*2 + 1]<<8)*16;
    j=0;
    this.sample[i].name="";
    while(buffer[offset+0x0030+j] && j<28) { 
      this.sample[i].name+=String.fromCharCode(buffer[offset+0x0030+j]);
      j++;
    }
    this.sample[i].length=buffer[offset+0x10]|buffer[offset+0x11]<<8;
    this.sample[i].loopstart=buffer[offset+0x14]|buffer[offset+0x15]<<8;
    this.sample[i].loopend=buffer[offset+0x18]|buffer[offset+0x19]<<8;
    this.sample[i].volume=buffer[offset+0x1c];
    this.sample[i].loop=buffer[offset+0x1f]&1;
    this.sample[i].stereo=(buffer[offset+0x1f]&2)>>1;
    this.sample[i].bits=(buffer[offset+0x1f]&4) ? 16 : 8;
    this.sample[i].c2spd=buffer[offset+0x20]|buffer[offset+0x21]<<8;

    // sample data
    var smpoffset=(buffer[offset+0x0d]<<16|buffer[offset+0x0e]|buffer[offset+0x0f]<<8)*16;
    this.sample[i].data=new Float32Array(this.sample[i].length);
    for(j=0;j<this.sample[i].length;j++) this.sample[i].data[j]=(buffer[smpoffset+j]-128)/128.0; // convert to mono float signed
  }
  
  // load and unpack patterns
  this.pattern=new Array();
  for(i=0;i<this.patNum;i++) {
    var offset=(buffer[0x0060+this.ordNum+this.insNum*2+i*2]|buffer[0x0060+this.ordNum+this.insNum*2+i*2+1]<<8)*16;
    var patlen=buffer[offset]|buffer[offset+1]<<8;
    var row=0, pos=0, ch=0;
  
    this.pattern[i]=new Uint8Array(32*64*5);
    for(row=0;row<64;row++) for(ch=0;ch<32;ch++) {
      this.pattern[i][row*32*5 + ch*5 + 0]=255;
      this.pattern[i][row*32*5 + ch*5 + 1]=0;
      this.pattern[i][row*32*5 + ch*5 + 2]=255;
      this.pattern[i][row*32*5 + ch*5 + 3]=255;
      this.pattern[i][row*32*5 + ch*5 + 4]=0;
    }
    
    row=0; ch=0;
    offset+=2;
    while(row<64) {
      if (c=buffer[offset+pos++]) {
        ch=c&31;
        if (c&32) {
          this.pattern[i][row*32*5 + ch*5 + 0]=buffer[offset+pos++]; // note
          this.pattern[i][row*32*5 + ch*5 + 1]=buffer[offset+pos++]; // instrument
        }
        if (c&64)
          this.pattern[i][row*32*5 + ch*5 + 2]=buffer[offset+pos++]; // volume
        if (c&128) {
          this.pattern[i][row*32*5 + ch*5 + 3]=buffer[offset+pos++]; // command
          this.pattern[i][row*32*5 + ch*5 + 4]=buffer[offset+pos++]; // parameter
        }
      } else row++;
    }
  }
  this.patterns=this.patNum;

  this.ready=true;
  this.loading=false;

  this.chvu=new Float32Array(this.channels);
  for(i=0;i<this.channels;i++) this.chvu[i]=0.0;

  return true;
}



// advance player
Screamtracker.prototype.advance=function(mod) {
  var spd=(((mod.samplerate*60)/mod.bpm)/4)/6;

  // advance player
  if (mod.offset>spd) { mod.tick++; mod.offset=0; mod.flags|=1; }
  if (mod.tick>=mod.speed) {
    if (mod.patterndelay) { // delay pattern
      if (mod.tick < ((mod.patternwait+1)*mod.speed)) {
        mod.patternwait++;
      } else {
        mod.row++; mod.tick=0; mod.flags|=2; mod.patterndelay=0;
      }
    }
    else {
      if (mod.flags&(16+32+64)) {
        if (mod.flags&64) { // loop pattern?
          mod.row=mod.looprow;
          mod.flags&=0xa1;
          mod.flags|=2;
        }
        else {
          if (mod.flags&16) { // pattern jump/break?
            mod.position=mod.patternjump;
            mod.row=mod.breakrow;
            mod.patternjump=0;
            mod.breakrow=0;
            mod.flags&=0xe1;
            mod.flags|=2;
          }
        }
        mod.tick=0;
      } else {
        mod.row++; mod.tick=0; mod.flags|=2;
      }
    }
  }
  if (mod.row>=64) {
    mod.position++;
    mod.row=0;
    mod.flags|=4;
    while (mod.patterntable[mod.position]==254) mod.position++; // skip markers
  }
  if (mod.position>=mod.songlen || mod.patterntable[mod.position]==255) {
    if (mod.repeat) {
      mod.position=0;
    } else {
      this.endofsong=true;
    }
    return;
  }
}



// process one channel on a row in pattern p, pp is an offset to pattern data
Screamtracker.prototype.process_note = function(mod, p, ch) {
  var n, s, pp, pv;

  pp=mod.row*5*32 + ch*5;
  
  n=mod.pattern[p][pp];
  s=mod.pattern[p][pp+1];
  if (s) {
    mod.channel[ch].sample=s-1;
    mod.channel[ch].volrampfrom=mod.channel[ch].voicevolume;
    mod.channel[ch].volramp=0.0;
    mod.channel[ch].volume=mod.sample[s-1].volume;
    mod.channel[ch].voicevolume=mod.channel[ch].volume;
    if (n==255 && (mod.channel[ch].samplepos > mod.sample[s-1].length)) mod.channel[ch].samplepos=0;
  }

  if (n<254) {
    // calc period for note
    n=(n&0x0f) + (n>>4)*12;
    pv=(8363.0 * mod.periodtable[n]) / mod.sample[mod.channel[ch].sample].c2spd;

    // noteon, except if command=0x07 ('G') (porta to note) or 0x0c ('L') (porta+volslide)
    if ((mod.channel[ch].command != 0x07) && (mod.channel[ch].command != 0x0c)) {
      mod.channel[ch].note=n;
      mod.channel[ch].period=pv;
      mod.channel[ch].voiceperiod=mod.channel[ch].period;
      mod.channel[ch].samplepos=0;
      if (mod.channel[ch].vibratowave>3) mod.channel[ch].vibratopos=0;
      
      mod.channel[ch].volrampfrom=0;
      mod.channel[ch].volramp=0.0;

      mod.channel[ch].flags|=3; // force sample speed recalc
      mod.channel[ch].noteon=1;      
    }
    // in either case, set the slide to note target to note period
    mod.channel[ch].slideto=pv;
  } else if (n==254) {
    mod.channel[ch].noteon=0; // sample off
    mod.channel[ch].volrampfrom=mod.channel[ch].voicevolume;
    mod.channel[ch].volramp=0.0;
    mod.channel[ch].voicevolume=0;    
  }
  
  if (mod.pattern[p][pp+2]<=64) {
    if (!s) {
      mod.channel[ch].volrampfrom=mod.channel[ch].voicevolume;
      mod.channel[ch].volramp=0.0;
    }
    mod.channel[ch].volume=mod.pattern[p][pp+2];
    mod.channel[ch].voicevolume=mod.channel[ch].volume;              
  }
}



// mix an audio buffer with data
Screamtracker.prototype.mix = function(ape, mod) {
  var f, fl, fr, pv;
  var p, pp, n, nn;

  outp=new Float32Array(2);

  mod.vu[0]=0.0;
  mod.vu[1]=0.0;

  var bufs=new Array(ape.outputBuffer.getChannelData(0), ape.outputBuffer.getChannelData(1));
  var buflen=ape.outputBuffer.length;
  for(var s=0;s<buflen;s++)
  {
    outp[0]=0.0;
    outp[1]=0.0;

    if (!mod.paused && !mod.endofsong && mod.playing)
    {
      mod.advance(mod);

      for(var ch=0;ch<mod.channels;ch++)
      {
        mod.chvu[ch]=0.0;
      
        // calculate playback position
        p=mod.patterntable[mod.position];
        pp=mod.row*5*32 + ch*5;

        if (mod.flags&2) { // new row
          mod.channel[ch].command=mod.pattern[p][pp+3];
          mod.channel[ch].data=mod.pattern[p][pp+4];
          if (!(mod.channel[ch].command==0x0e && (mod.channel[ch].data&0xf0)==0xd0)) { // note delay?
            mod.process_note(mod, p, ch);            
          }
        }
        
        // kill empty samples
        if (!mod.sample[mod.channel[ch].sample].length) mod.channel[ch].noteon=0;

        // effects        
        if (mod.flags&1) {
          if (mod.channel[ch].command < 27) {
            if (!mod.tick) {
              // process only on tick 0
              mod.effects_t0[mod.channel[ch].command](mod, ch);
            } else {
              mod.effects_t1[mod.channel[ch].command](mod, ch);    
            }
          }
        }

        // recalc sample speed if voiceperiod has changed
        if ((mod.channel[ch].flags&1 || mod.flags&2) && mod.channel[ch].voiceperiod)
          mod.channel[ch].samplespeed=(14317056.0/mod.channel[ch].voiceperiod) / mod.samplerate;
        
        // advance vibrato on each new tick
        if (mod.flags&1) {
          mod.channel[ch].vibratopos+=mod.channel[ch].vibratospeed*2
          mod.channel[ch].vibratopos&=0xff;
        }

        // add channel output to left/right master outputs
        fl=0.0; fr=0.0;
        if (mod.channel[ch].noteon || (!mod.channel[ch].noteon && mod.channel[ch].volramp<1.0)) {
          if (mod.sample[mod.channel[ch].sample].length > mod.channel[ch].samplepos) {
            fl=mod.sample[mod.channel[ch].sample].data[Math.floor(mod.channel[ch].samplepos)];
           
            // interpolate towards next sample (also when looping)
            f=mod.channel[ch].samplepos-Math.floor(mod.channel[ch].samplepos);
            if (mod.sample[mod.channel[ch].sample].loop && (mod.sample[mod.channel[ch].sample].loopend-mod.channel[ch].samplepos)<1)
            {
              fr=mod.sample[mod.channel[ch].sample].data[Math.floor(mod.sample[mod.channel[ch].sample].loopstart)];            
            } else if ((mod.channel[ch].samplepos+1)<mod.sample[mod.channel[ch].sample].length)
              fr=mod.sample[mod.channel[ch].sample].data[Math.floor(mod.channel[ch].samplepos+1)];
            fl=f*fr+(1.0-f)*fl;

            // ramp volume changes over 64 samples to avoid clicks (grr, there are still some left)
            fr=fl*(mod.channel[ch].voicevolume/64.0);
            if (mod.channel[ch].volramp<1.0) {
              fl=mod.channel[ch].volramp*fr + (1.0-mod.channel[ch].volramp)*(fl*(mod.channel[ch].volrampfrom/64.0));
              mod.channel[ch].volramp+=(1.0/mod.ramplen);
            } else {
              fl=fr;
            }
            
            // pan samples
            fr=fl*mod.pan_r[ch];
            fl*=mod.pan_l[ch];
          }
          outp[0]+=fl;
          outp[1]+=fr;
          mod.channel[ch].samplepos+=mod.channel[ch].samplespeed;
        }
        mod.chvu[ch]=Math.max(mod.chvu[ch], Math.abs(fl+fr));

        // loop or end samples
        if (mod.channel[ch].noteon) {
          if (mod.sample[mod.channel[ch].sample].loop) {
            if (mod.channel[ch].samplepos >= mod.sample[mod.channel[ch].sample].loopend) {
              mod.channel[ch].samplepos-=(mod.sample[mod.channel[ch].sample].loopend - mod.sample[mod.channel[ch].sample].loopstart);
            }
          } else {
            if (mod.channel[ch].samplepos >= mod.sample[mod.channel[ch].sample].length) {
              mod.channel[ch].noteon=0;
            }
          }
        }

        // clear channel flags
        mod.channel[ch].flags=0;
      } 
      mod.offset++;
      mod.flags&=0x70;      
    }
    
    // a more headphone-friendly stereo separation
    if (mod.separation) {
      t=outp[0];
      if (mod.separation==2) { // mono
        outp[0]=outp[0]*0.5 + outp[1]*0.5;
        outp[1]=outp[1]*0.5 + t*0.5;
      } else {
        outp[0]=outp[0]*0.65 + outp[1]*0.35;
        outp[1]=outp[1]*0.65 + t*0.35;
      }
    }

    // scale down, soft clip and update left/right vu meters
    t=(mod.volume/64.0);
    outp[0]*=t; outp[0]/=mod.mixval; outp[0]=0.5*(Math.abs(outp[0]+0.975)-Math.abs(outp[0]-0.975));
    outp[1]*=t; outp[1]/=mod.mixval; outp[1]=0.5*(Math.abs(outp[1]+0.975)-Math.abs(outp[1]-0.975));
    mod.vu[0]=Math.max(mod.vu[0], Math.abs(outp[0]));
    mod.vu[1]=Math.max(mod.vu[1], Math.abs(outp[1]));

    // done - store to output buffer
    bufs[0][s]=outp[0];
    bufs[1][s]=outp[1];
  }
}



//
// tick 0 effect functions
//
Screamtracker.prototype.effect_t0_a=function(mod, ch) { // set speed
  if (mod.channel[ch].data > 0) mod.speed=mod.channel[ch].data;
}

Screamtracker.prototype.effect_t0_b=function(mod, ch) { // pattern jump
  mod.breakrow=0;
  mod.patternjump=mod.channel[ch].data;
  mod.flags|=16;
}

Screamtracker.prototype.effect_t0_c=function(mod, ch) { // pattern break
  mod.breakrow=((mod.channel[ch].data&0xf0)>>4)*10 + (mod.channel[ch].data&0x0f);
  if (!(mod.flags&16)) mod.patternjump=mod.position+1;
  mod.flags|=16;  
}

Screamtracker.prototype.effect_t0_d=function(mod, ch) { // volume slide
  if (mod.channel[ch].data) mod.channel[ch].volslide=mod.channel[ch].data;

  if ((mod.channel[ch].volslide&0x0f)==0x0f) { // DxF fine up
    mod.channel[ch].voicevolume+=mod.channel[ch].volslide>>4;
  } else if ((mod.channel[ch].volslide>>4)==0x0f) { // DFx fine down
    mod.channel[ch].voicevolume-=mod.channel[ch].volslide&0x0f;
  } else {
    if (mod.fastslide) mod.effect_t1_d(mod, ch);
  }
  
  if (mod.channel[ch].voicevolume<0) mod.channel[ch].voicevolume=0;
  if (mod.channel[ch].voicevolume>64) mod.channel[ch].voicevolume=64;
}

Screamtracker.prototype.effect_t0_e=function(mod, ch) { // slide down
  if (mod.channel[ch].data) mod.channel[ch].slidespeed=mod.channel[ch].data;
  if ((mod.channel[ch].slidespeed&0xf0)==0xf0) {
    mod.channel[ch].voiceperiod+=(mod.channel[ch].slidespeed&0x0f)<<2;
  }
  if ((mod.channel[ch].slidespeed&0xf0)==0xe0) {
    mod.channel[ch].voiceperiod+=(mod.channel[ch].slidespeed&0x0f);
  }
  if (mod.channel[ch].voiceperiod>27392) mod.channel[ch].noteon=0;
  mod.channel[ch].flags|=3; // recalc speed    
}

Screamtracker.prototype.effect_t0_f=function(mod, ch) { // slide up
  if (mod.channel[ch].data) mod.channel[ch].slidespeed=mod.channel[ch].data;
  if ((mod.channel[ch].slidespeed&0xf0)==0xf0) {
    mod.channel[ch].voiceperiod-=(mod.channel[ch].slidespeed&0x0f)<<2;
  }
  if ((mod.channel[ch].slidespeed&0xf0)==0xe0) {
    mod.channel[ch].voiceperiod-=(mod.channel[ch].slidespeed&0x0f);
  }
  if (mod.channel[ch].voiceperiod<56) mod.channel[ch].noteon=0;
  mod.channel[ch].flags|=3; // recalc speed    
}

Screamtracker.prototype.effect_t0_g=function(mod, ch) { // slide to note
//  if (mod.channel[ch].data) mod.channel[ch].slidetospeed=mod.channel[ch].data;
  if (mod.channel[ch].data) mod.channel[ch].slidespeed=mod.channel[ch].data;
}

Screamtracker.prototype.effect_t0_h=function(mod, ch) { // vibrato
  if (mod.channel[ch].data&0x0f && mod.channel[ch].data&0xf0) {
    mod.channel[ch].vibratodepth=(mod.channel[ch].data&0x0f);
    mod.channel[ch].vibratospeed=(mod.channel[ch].data&0xf0)>>4;
  }
}

Screamtracker.prototype.effect_t0_i=function(mod, ch) { // tremor
}

Screamtracker.prototype.effect_t0_j=function(mod, ch) { // arpeggio
  if (mod.channel[ch].data) mod.channel[ch].arpeggio=mod.channel[ch].data;
  mod.channel[ch].voiceperiod=mod.channel[ch].period;
  mod.channel[ch].flags|=3; // recalc speed    
}

Screamtracker.prototype.effect_t0_k=function(mod, ch) { // vibrato + volslide
  mod.effect_t0_d(mod, ch);
}

Screamtracker.prototype.effect_t0_l=function(mod, ch) { // slide to note + volslide
  mod.effect_t0_d(mod, ch);
}

Screamtracker.prototype.effect_t0_m=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_n=function(mod, ch) { // -
}

Screamtracker.prototype.effect_t0_o=function(mod, ch) { // set sample offset
  if (mod.channel[ch].data*256 < mod.sample[mod.channel[ch].sample].length) {
    mod.channel[ch].samplepos=mod.channel[ch].data*256;
  }
}

Screamtracker.prototype.effect_t0_p=function(mod, ch) { // -
}

Screamtracker.prototype.effect_t0_q=function(mod, ch) { // retrig note
}

Screamtracker.prototype.effect_t0_r=function(mod, ch) { // tremolo
}

Screamtracker.prototype.effect_t0_s=function(mod, ch) { // Sxy effects
  var i=(mod.channel[ch].data&0xf0)>>4;
  mod.effects_t0_s[i](mod, ch);
}

Screamtracker.prototype.effect_t0_t=function(mod, ch) { // set tempo
  if (mod.channel[ch].data > 32) mod.bpm=mod.channel[ch].data;
}

Screamtracker.prototype.effect_t0_u=function(mod, ch) { // fibe vibrato
}

Screamtracker.prototype.effect_t0_v=function(mod, ch) { // set global volume
  mod.volume=mod.channel[ch].data;
}

Screamtracker.prototype.effect_t0_w=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_x=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_y=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_z=function(mod, ch) {  // sync for FMOD (was: unused)
  mod.syncqueue.unshift(mod.channel[ch].data&0x0f);
}



//
// tick 0 special Sxy effect functions
//
Screamtracker.prototype.effect_t0_s0=function(mod, ch) { // set filter (not implemented)
}

Screamtracker.prototype.effect_t0_s1=function(mod, ch) { // set glissando control
}

Screamtracker.prototype.effect_t0_s2=function(mod, ch) { // sync for BASS (was: set finetune)
  mod.syncqueue.unshift(mod.channel[ch].data&0x0f);
}

Screamtracker.prototype.effect_t0_s3=function(mod, ch) { // set vibrato waveform
  mod.channel[ch].vibratowave=mod.channel[ch].data&0x07;
}

Screamtracker.prototype.effect_t0_s4=function(mod, ch) { // set tremolo waveform
}

Screamtracker.prototype.effect_t0_s5=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_s6=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t0_s7=function(mod, ch) { // -
}

Screamtracker.prototype.effect_t0_s8=function(mod, ch) { // set panning position
  mod.pan_r[ch]=(mod.channel[ch].data&0x0f)/15.0;
  mod.pan_l[ch]=1.0-mod.pan_r[ch];
}

Screamtracker.prototype.effect_t0_s9=function(mod, ch) { // -
}

Screamtracker.prototype.effect_t0_sa=function(mod, ch) { // old stereo control (not implemented)
}

Screamtracker.prototype.effect_t0_sb=function(mod, ch) { // loop pattern
  if (mod.channel[ch].data&0x0f) {
    if (mod.loopcount) {
      mod.loopcount--;
    } else {
      mod.loopcount=mod.channel[ch].data&0x0f;
    }
    if (mod.loopcount) mod.flags|=64;
  } else {
    mod.looprow=mod.row;
  }
}

Screamtracker.prototype.effect_t0_sc=function(mod, ch) { // note cut
}

Screamtracker.prototype.effect_t0_sd=function(mod, ch) { // note delay
  if (mod.tick==(mod.channel[ch].data&0x0f)) {
    mod.process_note(mod, mod.patterntable[mod.position], ch);
  }
}

Screamtracker.prototype.effect_t0_se=function(mod, ch) { // pattern delay
  mod.patterndelay=mod.channel[ch].data&0x0f;
  mod.patternwait=0;
}

Screamtracker.prototype.effect_t0_sf=function(mod, ch) {  // funkrepeat (not implemented)
}



//
// tick 1+ effect functions
//
Screamtracker.prototype.effect_t1_a=function(mod, ch) { // set speed
}
Screamtracker.prototype.effect_t1_b=function(mod, ch) { // order jump
}
Screamtracker.prototype.effect_t1_c=function(mod, ch) { // jump to row
}

Screamtracker.prototype.effect_t1_d=function(mod, ch) { // volume slide
  if ((mod.channel[ch].volslide&0x0f)==0) {
    // slide up
    mod.channel[ch].voicevolume+=mod.channel[ch].volslide>>4;
  } else if ((mod.channel[ch].volslide>>4)==0) {
    // slide down
    mod.channel[ch].voicevolume-=mod.channel[ch].volslide&0x0f;
  }
  if (mod.channel[ch].voicevolume<0) mod.channel[ch].voicevolume=0;
  if (mod.channel[ch].voicevolume>64) mod.channel[ch].voicevolume=64;
}

Screamtracker.prototype.effect_t1_e=function(mod, ch) { // slide down
  if (mod.channel[ch].slidespeed<0xe0) {
    mod.channel[ch].voiceperiod+=mod.channel[ch].slidespeed*4;
  }
  if (mod.channel[ch].voiceperiod>27392) mod.channel[ch].noteon=0;
  mod.channel[ch].flags|=3; // recalc speed  
}

Screamtracker.prototype.effect_t1_f=function(mod, ch) { // slide up
  if (mod.channel[ch].slidespeed<0xe0) {
    mod.channel[ch].voiceperiod-=mod.channel[ch].slidespeed*4;
  }
  if (mod.channel[ch].voiceperiod<56) mod.channel[ch].noteon=0;
  mod.channel[ch].flags|=3; // recalc speed  
}

Screamtracker.prototype.effect_t1_g=function(mod, ch) { // slide to note
  if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) {
//    mod.channel[ch].voiceperiod+=4*mod.channel[ch].slidetospeed;
    mod.channel[ch].voiceperiod+=4*mod.channel[ch].slidespeed;
    if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto)
      mod.channel[ch].voiceperiod=mod.channel[ch].slideto;
  } else
  if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) {
//    mod.channel[ch].voiceperiod-=4*mod.channel[ch].slidetospeed;
    mod.channel[ch].voiceperiod-=4*mod.channel[ch].slidespeed;
    if (mod.channel[ch].voiceperiod<mod.channel[ch].slideto)
      mod.channel[ch].voiceperiod=mod.channel[ch].slideto;
  }
  mod.channel[ch].flags|=3; // recalc speed  
}

Screamtracker.prototype.effect_t1_h=function(mod, ch) { // vibrato
  mod.channel[ch].voiceperiod+=
    mod.vibratotable[mod.channel[ch].vibratowave&3][mod.channel[ch].vibratopos]*mod.channel[ch].vibratodepth/128;
  if (mod.channel[ch].voiceperiod>27392) mod.channel[ch].voiceperiod=27392;
  if (mod.channel[ch].voiceperiod<56) mod.channel[ch].voiceperiod=56;
  mod.channel[ch].flags|=1;
}

Screamtracker.prototype.effect_t1_i=function(mod, ch) { // tremor
}

Screamtracker.prototype.effect_t1_j=function(mod, ch) { // arpeggio
  var n=mod.channel[ch].note;
  if ((mod.tick&3)==1) n+=mod.channel[ch].arpeggio>>4;
  if ((mod.tick&3)==2) n+=mod.channel[ch].arpeggio&0x0f;
  mod.channel[ch].voiceperiod=(8363.0 * mod.periodtable[n]) / mod.sample[mod.channel[ch].sample].c2spd;  
  mod.channel[ch].flags|=3; // recalc speed  
}

Screamtracker.prototype.effect_t1_k=function(mod, ch) { // vibrato + volslide
  mod.effect_t1_h(mod, ch);
  mod.effect_t1_d(mod, ch);
}

Screamtracker.prototype.effect_t1_l=function(mod, ch) { // slide to note + volslide
  mod.effect_t1_g(mod, ch);
  mod.effect_t1_d(mod, ch);
}

Screamtracker.prototype.effect_t1_m=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_n=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_o=function(mod, ch) { // set sample offset
}
Screamtracker.prototype.effect_t1_p=function(mod, ch) { // -
}

Screamtracker.prototype.effect_t1_q=function(mod, ch) { // retrig note
  if (mod.tick%(mod.channel[ch].data&0x0f)==0) {
    mod.channel[ch].samplepos=0;
    switch (mod.channel[ch].data>>4) {
      case 6:
      case 7:
      case 14:
      case 15:
        mod.channel[ch].volume=Math.floor(mod.channel[ch].volume*mod.retrigvoltab[mod.channel[ch].data>>4]);
        break;
        
      default:
        mod.channel[ch].volume+=mod.retrigvoltab[mod.channel[ch].data>>4];
        break;
    }
    if (mod.channel[ch].volume<0) mod.channel[ch].volume=0;
    if (mod.channel[ch].volume>64) mod.channel[ch].volume=64;
  }
}

Screamtracker.prototype.effect_t1_r=function(mod, ch) { // tremolo
}

Screamtracker.prototype.effect_t1_s=function(mod, ch) { // special effects
  var i=(mod.channel[ch].data&0xf0)>>4;
  mod.effects_t1_s[i](mod, ch);
}

Screamtracker.prototype.effect_t1_t=function(mod, ch) { // set tempo
}

Screamtracker.prototype.effect_t1_u=function(mod, ch) { // fine vibrato
}

Screamtracker.prototype.effect_t1_v=function(mod, ch) { // set global volume
}
Screamtracker.prototype.effect_t1_w=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_x=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_y=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_z=function(mod, ch) {  // -
}



//
// tick 1+ special Sxy effect functions
//
Screamtracker.prototype.effect_t1_s0=function(mod, ch) { // set filter (not implemented)
}
Screamtracker.prototype.effect_t1_s1=function(mod, ch) { // set glissando control
}
Screamtracker.prototype.effect_t1_s2=function(mod, ch) { // set finetune
}
Screamtracker.prototype.effect_t1_s3=function(mod, ch) { // set vibrato waveform
}
Screamtracker.prototype.effect_t1_s4=function(mod, ch) { // set tremolo waveform
}
Screamtracker.prototype.effect_t1_s5=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s6=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s7=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_s8=function(mod, ch) { // set panning position
}
Screamtracker.prototype.effect_t1_s9=function(mod, ch) { // -
}
Screamtracker.prototype.effect_t1_sa=function(mod, ch) { // old stereo control (not implemented)
}

Screamtracker.prototype.effect_t1_sb=function(mod, ch) { // loop pattern
}

Screamtracker.prototype.effect_t1_sc=function(mod, ch) { // note cut
  if (mod.tick==(mod.channel[ch].data&0x0f)) mod.channel[ch].volume=0;
}

Screamtracker.prototype.effect_t1_sd=function(mod, ch) { // note delay
  mod.effect_t0_sd(mod, ch);
}

Screamtracker.prototype.effect_t1_se=function(mod, ch) { // pattern delay
}

Screamtracker.prototype.effect_t1_sf=function(mod, ch) {  // funkrepeat (not implemented)
}
