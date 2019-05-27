/*
  protracker module player for web audio api
  (c) 2012-2019 firehawk/tda  (firehawk@haxor.fi)

  todo:
  - pattern looping is broken (see mod.black_queen)
  - properly test EEx delay pattern
  - implement support for Soundtracker (M15) files
*/

// constructor for protracker player object
function Protracker()
{
  var i, t;

  this.clearsong();
  this.initialize();

  this.playing=false;
  this.paused=false;
  this.repeat=false;

  this.filter=false;

  this.mixval=4.0;

  this.syncqueue=[];

  this.samplerate=44100;

  // paula period values
  this.baseperiodtable=new Float32Array([
    856,808,762,720,678,640,604,570,538,508,480,453,
    428,404,381,360,339,320,302,285,269,254,240,226,
    214,202,190,180,170,160,151,143,135,127,120,113]);

  // finetune multipliers
  this.finetunetable=new Float32Array(16);
  for(t=0;t<16;t++) this.finetunetable[t]=Math.pow(2, (t-8)/12/8);

  // calc tables for vibrato waveforms
  this.vibratotable=new Array();
  for(t=0;t<4;t++) {
    this.vibratotable[t]=new Float32Array(64);
    for(i=0;i<64;i++) {
      switch(t) {
        case 0:
          this.vibratotable[t][i]=127*Math.sin(Math.PI*2*(i/64));
          break;
        case 1:
          this.vibratotable[t][i]=127-4*i;
          break;
        case 2:
          this.vibratotable[t][i]=(i<32)?127:-127;
          break;
        case 3:
          this.vibratotable[t][i]=(1-2*Math.random())*127;
          break;
      }
    }
  }

  // effect jumptables
  this.effects_t0 = new Array(
    this.effect_t0_0, this.effect_t0_1, this.effect_t0_2, this.effect_t0_3, this.effect_t0_4, this.effect_t0_5, this.effect_t0_6, this.effect_t0_7,
    this.effect_t0_8, this.effect_t0_9, this.effect_t0_a, this.effect_t0_b, this.effect_t0_c, this.effect_t0_d, this.effect_t0_e, this.effect_t0_f);
  this.effects_t0_e = new Array(
    this.effect_t0_e0, this.effect_t0_e1, this.effect_t0_e2, this.effect_t0_e3, this.effect_t0_e4, this.effect_t0_e5, this.effect_t0_e6, this.effect_t0_e7,
    this.effect_t0_e8, this.effect_t0_e9, this.effect_t0_ea, this.effect_t0_eb, this.effect_t0_ec, this.effect_t0_ed, this.effect_t0_ee, this.effect_t0_ef);
  this.effects_t1 = new Array(
    this.effect_t1_0, this.effect_t1_1, this.effect_t1_2, this.effect_t1_3, this.effect_t1_4, this.effect_t1_5, this.effect_t1_6, this.effect_t1_7,
    this.effect_t1_8, this.effect_t1_9, this.effect_t1_a, this.effect_t1_b, this.effect_t1_c, this.effect_t1_d, this.effect_t1_e, this.effect_t1_f);
  this.effects_t1_e = new Array(
    this.effect_t1_e0, this.effect_t1_e1, this.effect_t1_e2, this.effect_t1_e3, this.effect_t1_e4, this.effect_t1_e5, this.effect_t1_e6, this.effect_t1_e7,
    this.effect_t1_e8, this.effect_t1_e9, this.effect_t1_ea, this.effect_t1_eb, this.effect_t1_ec, this.effect_t1_ed, this.effect_t1_ee, this.effect_t1_ef);
}



// clear song data
Protracker.prototype.clearsong = function()
{
  this.title="";
  this.signature="";

  this.songlen=1;
  this.repeatpos=0;
  this.patterntable=new ArrayBuffer(128);
  for(i=0;i<128;i++) this.patterntable[i]=0;

  this.channels=4;

  this.sample=new Array();
  this.samples=31;
  for(i=0;i<31;i++) {
    this.sample[i]=new Object();
    this.sample[i].name="";
    this.sample[i].length=0;
    this.sample[i].finetune=0;
    this.sample[i].volume=64;
    this.sample[i].loopstart=0;
    this.sample[i].looplength=0;
    this.sample[i].data=0;
  }

  this.patterns=0;
  this.pattern=new Array();
  this.note=new Array();
  this.pattern_unpack=new Array();

  this.looprow=0;
  this.loopstart=0;
  this.loopcount=0;

  this.patterndelay=0;
  this.patternwait=0;
}


// initialize all player variables
Protracker.prototype.initialize = function()
{
  this.syncqueue=[];

  this.tick=0;
  this.position=0;
  this.row=0;
  this.offset=0;
  this.flags=0;

  this.speed=6;
  this.bpm=125;
  this.breakrow=0;
  this.patternjump=0;
  this.patterndelay=0;
  this.patternwait=0;
  this.endofsong=false;

  this.channel=new Array();
  for(i=0;i<this.channels;i++) {
    this.channel[i]=new Object();
    this.channel[i].sample=0;
    this.channel[i].period=214;
    this.channel[i].voiceperiod=214;
    this.channel[i].note=24;
    this.channel[i].volume=64;
    this.channel[i].command=0;
    this.channel[i].data=0;
    this.channel[i].samplepos=0;
    this.channel[i].samplespeed=0;
    this.channel[i].flags=0;
    this.channel[i].noteon=0;
    this.channel[i].slidespeed=0;
    this.channel[i].slideto=214;
    this.channel[i].slidetospeed=0;
    this.channel[i].arpeggio=0;

    this.channel[i].semitone=12;
    this.channel[i].vibratospeed=0
    this.channel[i].vibratodepth=0
    this.channel[i].vibratopos=0;
    this.channel[i].vibratowave=0;
  }
}



// parse the module from local buffer
Protracker.prototype.parse = function(buffer)
{
  var i,j,c;

  for(i=0;i<4;i++) this.signature+=String.fromCharCode(buffer[1080+i]);
  switch (this.signature) {
    case "M.K.":
    case "M!K!":
    case "M&K!":
    case "PATT":
    case "NSMS":
    case "LARD":
    case "FEST":
    case "FIST":
    case "N.T.":
    case "FLT4":
    case "EXO4":
    case "4CHN":
    case "04CH":
    case "04CN":
    case "004C":
    case "CD41":
    case "FA04":
    case "TDZ4":
      break;

    case "1CHN":
    case "01CH":
    case "01CN":
    case "001C":
    case "CD11":
    case "FA01":
    case "TDZ1":
      this.channels=1;
      break;

    case "2CHN":
    case "02CH":
    case "02CN":
    case "002C":
    case "CD21":
    case "FA02":
    case "TDZ2":
      this.channels=2;
      break;

    case "3CHN":
    case "03CH":
    case "03CN":
    case "003C":
    case "CD31":
    case "FA03":
    case "TDZ3":
      this.channels=3;
      break;

    case "5CHN":
    case "05CH":
    case "05CN":
    case "005C":
    case "CD51":
    case "FA05":
    case "TDZ5":
      this.channels=5;
      break;

    case "6CHN":
    case "06CH":
    case "06CN":
    case "006C":
    case "CD61":
    case "FA06":
    case "TDZ6":
      this.channels=6;
      break;

    case "7CHN":
    case "07CH":
    case "07CN":
    case "007C":
    case "CD71":
    case "FA07":
    case "TDZ7":
      this.channels=7;
      break;

    case "8CHN":
    case "08CH":
    case "08CN":
    case "008C":
    case "CD81":
    case "FA08":
    case "TDZ8":
    case "OKTA":
    case "OCTA":
      this.channels=8;
      break;

    case "9CHN":
    case "09CH":
    case "09CN":
    case "009C":
    case "CD91":
    case "FA09":
    case "TDZ9":
      this.channels=9;
      break;

    case "10CH":
    case "10CN":
    case "010C":
      this.channels=10;
      break;

    case "11CH":
    case "11CN":
    case "011C":
      this.channels=11;
      break;

    case "12CH":
    case "12CN":
    case "012C":
      this.channels=12;
      break;

    case "13CH":
    case "13CN":
    case "013C":
      this.channels=13;
      break;

    case "14CH":
    case "14CN":
    case "014C":
      this.channels=14;
      break;

    case "15CH":
    case "15CN":
    case "015C":
      this.channels=15;
      break;

    case "16CH":
    case "16CN":
    case "016C":
      this.channels=16;
      break;

    case "17CH":
    case "17CN":
    case "017C":
      this.channels=17;
      break;

    case "18CH":
    case "18CN":
    case "018C":
      this.channels=18;
      break;

    case "19CH":
    case "19CN":
    case "019C":
      this.channels=19;
      break;

    case "20CH":
    case "20CN":
    case "020C":
      this.channels=20;
      break;

    case "21CH":
    case "21CN":
    case "021C":
      this.channels=21;
      break;

    case "22CH":
    case "22CN":
    case "022C":
      this.channels=22;
      break;

    case "23CH":
    case "23CN":
    case "023C":
      this.channels=23;
      break;

    case "24CH":
    case "24CN":
    case "024C":
      this.channels=24;
      break;

    case "25CH":
    case "25CN":
    case "025C":
      this.channels=25;
      break;

    case "26CH":
    case "26CN":
    case "026C":
      this.channels=26;
      break;

    case "27CH":
    case "27CN":
    case "027C":
      this.channels=27;
      break;

    case "28CH":
    case "28CN":
    case "028C":
      this.channels=28;
      break;

    case "29CH":
    case "29CN":
    case "029C":
      this.channels=29;
      break;

    case "30CH":
    case "30CN":
    case "030C":
      this.channels=30;
      break;

    case "31CH":
    case "31CN":
    case "031C":
      this.channels=31;
      break;

    case "32CH":
    case "32CN":
    case "032C":
      this.channels=32;
      break;

    case "33CH":
    case "33CN":
    case "033C":
      this.channels=33;
      break;

    case "34CH":
    case "34CN":
    case "034C":
      this.channels=34;
      break;

    case "35CH":
    case "35CN":
    case "035C":
      this.channels=35;
      break;

    case "36CH":
    case "36CN":
    case "036C":
      this.channels=36;
      break;

    case "37CH":
    case "37CN":
    case "037C":
      this.channels=37;
      break;

    case "38CH":
    case "38CN":
    case "038C":
      this.channels=38;
      break;

    case "39CH":
    case "39CN":
    case "039C":
      this.channels=39;
      break;

    case "40CH":
    case "40CN":
    case "040C":
      this.channels=40;
      break;

    case "41CH":
    case "41CN":
    case "041C":
      this.channels=41;
      break;

    case "42CH":
    case "42CN":
    case "042C":
      this.channels=42;
      break;

    case "43CH":
    case "43CN":
    case "043C":
      this.channels=43;
      break;

    case "44CH":
    case "44CN":
    case "044C":
      this.channels=44;
      break;

    case "45CH":
    case "45CN":
    case "045C":
      this.channels=45;
      break;

    case "46CH":
    case "46CN":
    case "046C":
      this.channels=46;
      break;

    case "47CH":
    case "47CN":
    case "047C":
      this.channels=47;
      break;

    case "48CH":
    case "48CN":
    case "048C":
      this.channels=48;
      break;

    case "49CH":
    case "49CN":
    case "049C":
      this.channels=49;
      break;

    case "50CH":
    case "50CN":
    case "050C":
      this.channels=50;
      break;

    case "51CH":
    case "51CN":
    case "051C":
      this.channels=51;
      break;

    case "52CH":
    case "52CN":
    case "052C":
      this.channels=52;
      break;

    case "53CH":
    case "53CN":
    case "053C":
      this.channels=53;
      break;

    case "54CH":
    case "54CN":
    case "054C":
      this.channels=54;
      break;

    case "55CH":
    case "55CN":
    case "055C":
      this.channels=55;
      break;

    case "56CH":
    case "56CN":
    case "056C":
      this.channels=56;
      break;

    case "57CH":
    case "57CN":
    case "057C":
      this.channels=57;
      break;

    case "58CH":
    case "58CN":
    case "058C":
      this.channels=58;
      break;

    case "59CH":
    case "59CN":
    case "059C":
      this.channels=59;
      break;

    case "60CH":
    case "60CN":
    case "060C":
      this.channels=60;
      break;

    case "61CH":
    case "61CN":
    case "061C":
      this.channels=61;
      break;

    case "62CH":
    case "62CN":
    case "062C":
      this.channels=62;
      break;

    case "63CH":
    case "63CN":
    case "063C":
      this.channels=63;
      break;

    case "64CH":
    case "64CN":
    case "064C":
      this.channels=64;
      break;

    case "65CH":
    case "65CN":
    case "065C":
      this.channels=65;
      break;

    case "66CH":
    case "66CN":
    case "066C":
      this.channels=66;
      break;

    case "67CH":
    case "67CN":
    case "067C":
      this.channels=67;
      break;

    case "68CH":
    case "68CN":
    case "068C":
      this.channels=68;
      break;

    case "69CH":
    case "69CN":
    case "069C":
      this.channels=69;
      break;

    case "70CH":
    case "70CN":
    case "070C":
      this.channels=70;
      break;

    case "71CH":
    case "71CN":
    case "071C":
      this.channels=71;
      break;

    case "72CH":
    case "72CN":
    case "072C":
      this.channels=72;
      break;

    case "73CH":
    case "73CN":
    case "073C":
      this.channels=73;
      break;

    case "74CH":
    case "74CN":
    case "074C":
      this.channels=74;
      break;

    case "75CH":
    case "75CN":
    case "075C":
      this.channels=75;
      break;

    case "76CH":
    case "76CN":
    case "076C":
      this.channels=76;
      break;

    case "77CH":
    case "77CN":
    case "077C":
      this.channels=77;
      break;

    case "78CH":
    case "78CN":
    case "078C":
      this.channels=78;
      break;

    case "79CH":
    case "79CN":
    case "079C":
      this.channels=79;
      break;

    case "80CH":
    case "80CN":
    case "080C":
      this.channels=80;
      break;

    case "81CH":
    case "81CN":
    case "081C":
      this.channels=81;
      break;

    case "82CH":
    case "82CN":
    case "082C":
      this.channels=82;
      break;

    case "83CH":
    case "83CN":
    case "083C":
      this.channels=83;
      break;

    case "84CH":
    case "84CN":
    case "084C":
      this.channels=84;
      break;

    case "85CH":
    case "85CN":
    case "085C":
      this.channels=85;
      break;

    case "86CH":
    case "86CN":
    case "086C":
      this.channels=86;
      break;

    case "87CH":
    case "87CN":
    case "087C":
      this.channels=87;
      break;

    case "88CH":
    case "88CN":
    case "088C":
      this.channels=88;
      break;

    case "89CH":
    case "89CN":
    case "089C":
      this.channels=89;
      break;

    case "90CH":
    case "90CN":
    case "090C":
      this.channels=90;
      break;

    case "91CH":
    case "91CN":
    case "091C":
      this.channels=91;
      break;

    case "92CH":
    case "92CN":
    case "092C":
      this.channels=92;
      break;

    case "93CH":
    case "93CN":
    case "093C":
      this.channels=93;
      break;

    case "94CH":
    case "94CN":
    case "094C":
      this.channels=94;
      break;

    case "95CH":
    case "95CN":
    case "095C":
      this.channels=95;
      break;

    case "96CH":
    case "96CN":
    case "096C":
      this.channels=96;
      break;

    case "97CH":
    case "97CN":
    case "097C":
      this.channels=97;
      break;

    case "98CH":
    case "98CN":
    case "098C":
      this.channels=98;
      break;

    case "99CH":
    case "99CN":
    case "099C":
      this.channels=99;
      break;

    case "100C":
      this.channels=100;
      break;

    case "101C":
      this.channels=101;
      break;

    case "102C":
      this.channels=102;
      break;

    case "103C":
      this.channels=103;
      break;

    case "104C":
      this.channels=104;
      break;

    case "105C":
      this.channels=105;
      break;

    case "106C":
      this.channels=106;
      break;

    case "107C":
      this.channels=107;
      break;

    case "108C":
      this.channels=108;
      break;

    case "109C":
      this.channels=109;
      break;

    case "110C":
      this.channels=110;
      break;

    case "111C":
      this.channels=111;
      break;

    case "112C":
      this.channels=112;
      break;

    case "113C":
      this.channels=113;
      break;

    case "114C":
      this.channels=114;
      break;

    case "115C":
      this.channels=115;
      break;

    case "116C":
      this.channels=116;
      break;

    case "117C":
      this.channels=117;
      break;

    case "118C":
      this.channels=118;
      break;

    case "119C":
      this.channels=119;
      break;

    case "120C":
      this.channels=120;
      break;

    case "121C":
      this.channels=121;
      break;

    case "122C":
      this.channels=122;
      break;

    case "123C":
      this.channels=123;
      break;

    case "124C":
      this.channels=124;
      break;

    case "125C":
      this.channels=125;
      break;

    case "126C":
      this.channels=126;
      break;

    case "127C":
      this.channels=127;
      break;

    case "128C":
      this.channels=128;
      break;

    case "129C":
      this.channels=129;
      break;

    case "130C":
      this.channels=130;
      break;

    case "131C":
      this.channels=131;
      break;

    case "132C":
      this.channels=132;
      break;

    case "133C":
      this.channels=133;
      break;

    case "134C":
      this.channels=134;
      break;

    case "135C":
      this.channels=135;
      break;

    case "136C":
      this.channels=136;
      break;

    case "137C":
      this.channels=137;
      break;

    case "138C":
      this.channels=138;
      break;

    case "139C":
      this.channels=139;
      break;

    case "140C":
      this.channels=140;
      break;

    case "141C":
      this.channels=141;
      break;

    case "142C":
      this.channels=142;
      break;

    case "143C":
      this.channels=143;
      break;

    case "144C":
      this.channels=144;
      break;

    case "145C":
      this.channels=145;
      break;

    case "146C":
      this.channels=146;
      break;

    case "147C":
      this.channels=147;
      break;

    case "148C":
      this.channels=148;
      break;

    case "149C":
      this.channels=149;
      break;

    case "150C":
      this.channels=150;
      break;

    case "151C":
      this.channels=151;
      break;

    case "152C":
      this.channels=152;
      break;

    case "153C":
      this.channels=153;
      break;

    case "154C":
      this.channels=154;
      break;

    case "155C":
      this.channels=155;
      break;

    case "156C":
      this.channels=156;
      break;

    case "157C":
      this.channels=157;
      break;

    case "158C":
      this.channels=158;
      break;

    case "159C":
      this.channels=159;
      break;

    case "160C":
      this.channels=160;
      break;

    case "161C":
      this.channels=161;
      break;

    case "162C":
      this.channels=162;
      break;

    case "163C":
      this.channels=163;
      break;

    case "164C":
      this.channels=164;
      break;

    case "165C":
      this.channels=165;
      break;

    case "166C":
      this.channels=166;
      break;

    case "167C":
      this.channels=167;
      break;

    case "168C":
      this.channels=168;
      break;

    case "169C":
      this.channels=169;
      break;

    case "170C":
      this.channels=170;
      break;

    case "171C":
      this.channels=171;
      break;

    case "172C":
      this.channels=172;
      break;

    case "173C":
      this.channels=173;
      break;

    case "174C":
      this.channels=174;
      break;

    case "175C":
      this.channels=175;
      break;

    case "176C":
      this.channels=176;
      break;

    case "177C":
      this.channels=177;
      break;

    case "178C":
      this.channels=178;
      break;

    case "179C":
      this.channels=179;
      break;

    case "180C":
      this.channels=180;
      break;

    case "181C":
      this.channels=181;
      break;

    case "182C":
      this.channels=182;
      break;

    case "183C":
      this.channels=183;
      break;

    case "184C":
      this.channels=184;
      break;

    case "185C":
      this.channels=185;
      break;

    case "186C":
      this.channels=186;
      break;

    case "187C":
      this.channels=187;
      break;

    case "188C":
      this.channels=188;
      break;

    case "189C":
      this.channels=189;
      break;

    case "190C":
      this.channels=190;
      break;

    case "191C":
      this.channels=191;
      break;

    case "192C":
      this.channels=192;
      break;

    case "193C":
      this.channels=193;
      break;

    case "194C":
      this.channels=194;
      break;

    case "195C":
      this.channels=195;
      break;

    case "196C":
      this.channels=196;
      break;

    case "197C":
      this.channels=197;
      break;

    case "198C":
      this.channels=198;
      break;

    case "199C":
      this.channels=199;
      break;

    case "200C":
      this.channels=200;
      break;

    case "201C":
      this.channels=201;
      break;

    case "202C":
      this.channels=202;
      break;

    case "203C":
      this.channels=203;
      break;

    case "204C":
      this.channels=204;
      break;

    case "205C":
      this.channels=205;
      break;

    case "206C":
      this.channels=206;
      break;

    case "207C":
      this.channels=207;
      break;

    case "208C":
      this.channels=208;
      break;

    case "209C":
      this.channels=209;
      break;

    case "210C":
      this.channels=210;
      break;

    case "211C":
      this.channels=211;
      break;

    case "212C":
      this.channels=212;
      break;

    case "213C":
      this.channels=213;
      break;

    case "214C":
      this.channels=214;
      break;

    case "215C":
      this.channels=215;
      break;

    case "216C":
      this.channels=216;
      break;

    case "217C":
      this.channels=217;
      break;

    case "218C":
      this.channels=218;
      break;

    case "219C":
      this.channels=219;
      break;

    case "220C":
      this.channels=220;
      break;

    case "221C":
      this.channels=221;
      break;

    case "222C":
      this.channels=222;
      break;

    case "223C":
      this.channels=223;
      break;

    case "224C":
      this.channels=224;
      break;

    case "225C":
      this.channels=225;
      break;

    case "226C":
      this.channels=226;
      break;

    case "227C":
      this.channels=227;
      break;

    case "228C":
      this.channels=228;
      break;

    case "229C":
      this.channels=229;
      break;

    case "230C":
      this.channels=230;
      break;

    case "231C":
      this.channels=231;
      break;

    case "232C":
      this.channels=232;
      break;

    case "233C":
      this.channels=233;
      break;

    case "234C":
      this.channels=234;
      break;

    case "235C":
      this.channels=235;
      break;

    case "236C":
      this.channels=236;
      break;

    case "237C":
      this.channels=237;
      break;

    case "238C":
      this.channels=238;
      break;

    case "239C":
      this.channels=239;
      break;

    case "240C":
      this.channels=240;
      break;

    case "241C":
      this.channels=241;
      break;

    case "242C":
      this.channels=242;
      break;

    case "243C":
      this.channels=243;
      break;

    case "244C":
      this.channels=244;
      break;

    case "245C":
      this.channels=245;
      break;

    case "246C":
      this.channels=246;
      break;

    case "247C":
      this.channels=247;
      break;

    case "248C":
      this.channels=248;
      break;

    case "249C":
      this.channels=249;
      break;

    case "250C":
      this.channels=250;
      break;

    case "251C":
      this.channels=251;
      break;

    case "252C":
      this.channels=252;
      break;

    case "253C":
      this.channels=253;
      break;

    case "254C":
      this.channels=254;
      break;

    case "255C":
      this.channels=255;
      break;

    case "256C":
      this.channels=256;
      break;

    case "257C":
      this.channels=257;
      break;

    case "258C":
      this.channels=258;
      break;

    case "259C":
      this.channels=259;
      break;

    case "260C":
      this.channels=260;
      break;

    case "261C":
      this.channels=261;
      break;

    case "262C":
      this.channels=262;
      break;

    case "263C":
      this.channels=263;
      break;

    case "264C":
      this.channels=264;
      break;

    case "265C":
      this.channels=265;
      break;

    case "266C":
      this.channels=266;
      break;

    case "267C":
      this.channels=267;
      break;

    case "268C":
      this.channels=268;
      break;

    case "269C":
      this.channels=269;
      break;

    case "270C":
      this.channels=270;
      break;

    case "271C":
      this.channels=271;
      break;

    case "272C":
      this.channels=272;
      break;

    case "273C":
      this.channels=273;
      break;

    case "274C":
      this.channels=274;
      break;

    case "275C":
      this.channels=275;
      break;

    case "276C":
      this.channels=276;
      break;

    case "277C":
      this.channels=277;
      break;

    case "278C":
      this.channels=278;
      break;

    case "279C":
      this.channels=279;
      break;

    case "280C":
      this.channels=280;
      break;

    case "281C":
      this.channels=281;
      break;

    case "282C":
      this.channels=282;
      break;

    case "283C":
      this.channels=283;
      break;

    case "284C":
      this.channels=284;
      break;

    case "285C":
      this.channels=285;
      break;

    case "286C":
      this.channels=286;
      break;

    case "287C":
      this.channels=287;
      break;

    case "288C":
      this.channels=288;
      break;

    case "289C":
      this.channels=289;
      break;

    case "290C":
      this.channels=290;
      break;

    case "291C":
      this.channels=291;
      break;

    case "292C":
      this.channels=292;
      break;

    case "293C":
      this.channels=293;
      break;

    case "294C":
      this.channels=294;
      break;

    case "295C":
      this.channels=295;
      break;

    case "296C":
      this.channels=296;
      break;

    case "297C":
      this.channels=297;
      break;

    case "298C":
      this.channels=298;
      break;

    case "299C":
      this.channels=299;
      break;

    case "300C":
      this.channels=300;
      break;

    case "301C":
      this.channels=301;
      break;

    case "302C":
      this.channels=302;
      break;

    case "303C":
      this.channels=303;
      break;

    case "304C":
      this.channels=304;
      break;

    case "305C":
      this.channels=305;
      break;

    case "306C":
      this.channels=306;
      break;

    case "307C":
      this.channels=307;
      break;

    case "308C":
      this.channels=308;
      break;

    case "309C":
      this.channels=309;
      break;

    case "310C":
      this.channels=310;
      break;

    case "311C":
      this.channels=311;
      break;

    case "312C":
      this.channels=312;
      break;

    case "313C":
      this.channels=313;
      break;

    case "314C":
      this.channels=314;
      break;

    case "315C":
      this.channels=315;
      break;

    case "316C":
      this.channels=316;
      break;

    case "317C":
      this.channels=317;
      break;

    case "318C":
      this.channels=318;
      break;

    case "319C":
      this.channels=319;
      break;

    case "320C":
      this.channels=320;
      break;

    case "321C":
      this.channels=321;
      break;

    case "322C":
      this.channels=322;
      break;

    case "323C":
      this.channels=323;
      break;

    case "324C":
      this.channels=324;
      break;

    case "325C":
      this.channels=325;
      break;

    case "326C":
      this.channels=326;
      break;

    case "327C":
      this.channels=327;
      break;

    case "328C":
      this.channels=328;
      break;

    case "329C":
      this.channels=329;
      break;

    case "330C":
      this.channels=330;
      break;

    case "331C":
      this.channels=331;
      break;

    case "332C":
      this.channels=332;
      break;

    case "333C":
      this.channels=333;
      break;

    case "334C":
      this.channels=334;
      break;

    case "335C":
      this.channels=335;
      break;

    case "336C":
      this.channels=336;
      break;

    case "337C":
      this.channels=337;
      break;

    case "338C":
      this.channels=338;
      break;

    case "339C":
      this.channels=339;
      break;

    case "340C":
      this.channels=340;
      break;

    case "341C":
      this.channels=341;
      break;

    case "342C":
      this.channels=342;
      break;

    case "343C":
      this.channels=343;
      break;

    case "344C":
      this.channels=344;
      break;

    case "345C":
      this.channels=345;
      break;

    case "346C":
      this.channels=346;
      break;

    case "347C":
      this.channels=347;
      break;

    case "348C":
      this.channels=348;
      break;

    case "349C":
      this.channels=349;
      break;

    case "350C":
      this.channels=350;
      break;

    case "351C":
      this.channels=351;
      break;

    case "352C":
      this.channels=352;
      break;

    case "353C":
      this.channels=353;
      break;

    case "354C":
      this.channels=354;
      break;

    case "355C":
      this.channels=355;
      break;

    case "356C":
      this.channels=356;
      break;

    case "357C":
      this.channels=357;
      break;

    case "358C":
      this.channels=358;
      break;

    case "359C":
      this.channels=359;
      break;

    case "360C":
      this.channels=360;
      break;

    case "361C":
      this.channels=361;
      break;

    case "362C":
      this.channels=362;
      break;

    case "363C":
      this.channels=363;
      break;

    case "364C":
      this.channels=364;
      break;

    case "365C":
      this.channels=365;
      break;

    case "366C":
      this.channels=366;
      break;

    case "367C":
      this.channels=367;
      break;

    case "368C":
      this.channels=368;
      break;

    case "369C":
      this.channels=369;
      break;

    case "370C":
      this.channels=370;
      break;

    case "371C":
      this.channels=371;
      break;

    case "372C":
      this.channels=372;
      break;

    case "373C":
      this.channels=373;
      break;

    case "374C":
      this.channels=374;
      break;

    case "375C":
      this.channels=375;
      break;

    case "376C":
      this.channels=376;
      break;

    case "377C":
      this.channels=377;
      break;

    case "378C":
      this.channels=378;
      break;

    case "379C":
      this.channels=379;
      break;

    case "380C":
      this.channels=380;
      break;

    case "381C":
      this.channels=381;
      break;

    case "382C":
      this.channels=382;
      break;

    case "383C":
      this.channels=383;
      break;

    case "384C":
      this.channels=384;
      break;

    case "385C":
      this.channels=385;
      break;

    case "386C":
      this.channels=386;
      break;

    case "387C":
      this.channels=387;
      break;

    case "388C":
      this.channels=388;
      break;

    case "389C":
      this.channels=389;
      break;

    case "390C":
      this.channels=390;
      break;

    case "391C":
      this.channels=391;
      break;

    case "392C":
      this.channels=392;
      break;

    case "393C":
      this.channels=393;
      break;

    case "394C":
      this.channels=394;
      break;

    case "395C":
      this.channels=395;
      break;

    case "396C":
      this.channels=396;
      break;

    case "397C":
      this.channels=397;
      break;

    case "398C":
      this.channels=398;
      break;

    case "399C":
      this.channels=399;
      break;

    case "400C":
      this.channels=400;
      break;

    case "401C":
      this.channels=401;
      break;

    case "402C":
      this.channels=402;
      break;

    case "403C":
      this.channels=403;
      break;

    case "404C":
      this.channels=404;
      break;

    case "405C":
      this.channels=405;
      break;

    case "406C":
      this.channels=406;
      break;

    case "407C":
      this.channels=407;
      break;

    case "408C":
      this.channels=408;
      break;

    case "409C":
      this.channels=409;
      break;

    case "410C":
      this.channels=410;
      break;

    case "411C":
      this.channels=411;
      break;

    case "412C":
      this.channels=412;
      break;

    case "413C":
      this.channels=413;
      break;

    case "414C":
      this.channels=414;
      break;

    case "415C":
      this.channels=415;
      break;

    case "416C":
      this.channels=416;
      break;

    case "417C":
      this.channels=417;
      break;

    case "418C":
      this.channels=418;
      break;

    case "419C":
      this.channels=419;
      break;

    case "420C":
      this.channels=420;
      break;

    case "421C":
      this.channels=421;
      break;

    case "422C":
      this.channels=422;
      break;

    case "423C":
      this.channels=423;
      break;

    case "424C":
      this.channels=424;
      break;

    case "425C":
      this.channels=425;
      break;

    case "426C":
      this.channels=426;
      break;

    case "427C":
      this.channels=427;
      break;

    case "428C":
      this.channels=428;
      break;

    case "429C":
      this.channels=429;
      break;

    case "430C":
      this.channels=430;
      break;

    case "431C":
      this.channels=431;
      break;

    case "432C":
      this.channels=432;
      break;

    case "433C":
      this.channels=433;
      break;

    case "434C":
      this.channels=434;
      break;

    case "435C":
      this.channels=435;
      break;

    case "436C":
      this.channels=436;
      break;

    case "437C":
      this.channels=437;
      break;

    case "438C":
      this.channels=438;
      break;

    case "439C":
      this.channels=439;
      break;

    case "440C":
      this.channels=440;
      break;

    case "441C":
      this.channels=441;
      break;

    case "442C":
      this.channels=442;
      break;

    case "443C":
      this.channels=443;
      break;

    case "444C":
      this.channels=444;
      break;

    case "445C":
      this.channels=445;
      break;

    case "446C":
      this.channels=446;
      break;

    case "447C":
      this.channels=447;
      break;

    case "448C":
      this.channels=448;
      break;

    case "449C":
      this.channels=449;
      break;

    case "450C":
      this.channels=450;
      break;

    case "451C":
      this.channels=451;
      break;

    case "452C":
      this.channels=452;
      break;

    case "453C":
      this.channels=453;
      break;

    case "454C":
      this.channels=454;
      break;

    case "455C":
      this.channels=455;
      break;

    case "456C":
      this.channels=456;
      break;

    case "457C":
      this.channels=457;
      break;

    case "458C":
      this.channels=458;
      break;

    case "459C":
      this.channels=459;
      break;

    case "460C":
      this.channels=460;
      break;

    case "461C":
      this.channels=461;
      break;

    case "462C":
      this.channels=462;
      break;

    case "463C":
      this.channels=463;
      break;

    case "464C":
      this.channels=464;
      break;

    case "465C":
      this.channels=465;
      break;

    case "466C":
      this.channels=466;
      break;

    case "467C":
      this.channels=467;
      break;

    case "468C":
      this.channels=468;
      break;

    case "469C":
      this.channels=469;
      break;

    case "470C":
      this.channels=470;
      break;

    case "471C":
      this.channels=471;
      break;

    case "472C":
      this.channels=472;
      break;

    case "473C":
      this.channels=473;
      break;

    case "474C":
      this.channels=474;
      break;

    case "475C":
      this.channels=475;
      break;

    case "476C":
      this.channels=476;
      break;

    case "477C":
      this.channels=477;
      break;

    case "478C":
      this.channels=478;
      break;

    case "479C":
      this.channels=479;
      break;

    case "480C":
      this.channels=480;
      break;

    case "481C":
      this.channels=481;
      break;

    case "482C":
      this.channels=482;
      break;

    case "483C":
      this.channels=483;
      break;

    case "484C":
      this.channels=484;
      break;

    case "485C":
      this.channels=485;
      break;

    case "486C":
      this.channels=486;
      break;

    case "487C":
      this.channels=487;
      break;

    case "488C":
      this.channels=488;
      break;

    case "489C":
      this.channels=489;
      break;

    case "490C":
      this.channels=490;
      break;

    case "491C":
      this.channels=491;
      break;

    case "492C":
      this.channels=492;
      break;

    case "493C":
      this.channels=493;
      break;

    case "494C":
      this.channels=494;
      break;

    case "495C":
      this.channels=495;
      break;

    case "496C":
      this.channels=496;
      break;

    case "497C":
      this.channels=497;
      break;

    case "498C":
      this.channels=498;
      break;

    case "499C":
      this.channels=499;
      break;

    case "500C":
      this.channels=500;
      break;

    case "501C":
      this.channels=501;
      break;

    case "502C":
      this.channels=502;
      break;

    case "503C":
      this.channels=503;
      break;

    case "504C":
      this.channels=504;
      break;

    case "505C":
      this.channels=505;
      break;

    case "506C":
      this.channels=506;
      break;

    case "507C":
      this.channels=507;
      break;

    case "508C":
      this.channels=508;
      break;

    case "509C":
      this.channels=509;
      break;

    case "510C":
      this.channels=510;
      break;

    case "511C":
      this.channels=511;
      break;

    case "512C":
      this.channels=512;
      break;

    case "513C":
      this.channels=513;
      break;

    case "514C":
      this.channels=514;
      break;

    case "515C":
      this.channels=515;
      break;

    case "516C":
      this.channels=516;
      break;

    case "517C":
      this.channels=517;
      break;

    case "518C":
      this.channels=518;
      break;

    case "519C":
      this.channels=519;
      break;

    case "520C":
      this.channels=520;
      break;

    case "521C":
      this.channels=521;
      break;

    case "522C":
      this.channels=522;
      break;

    case "523C":
      this.channels=523;
      break;

    case "524C":
      this.channels=524;
      break;

    case "525C":
      this.channels=525;
      break;

    case "526C":
      this.channels=526;
      break;

    case "527C":
      this.channels=527;
      break;

    case "528C":
      this.channels=528;
      break;

    case "529C":
      this.channels=529;
      break;

    case "530C":
      this.channels=530;
      break;

    case "531C":
      this.channels=531;
      break;

    case "532C":
      this.channels=532;
      break;

    case "533C":
      this.channels=533;
      break;

    case "534C":
      this.channels=534;
      break;

    case "535C":
      this.channels=535;
      break;

    case "536C":
      this.channels=536;
      break;

    case "537C":
      this.channels=537;
      break;

    case "538C":
      this.channels=538;
      break;

    case "539C":
      this.channels=539;
      break;

    case "540C":
      this.channels=540;
      break;

    case "541C":
      this.channels=541;
      break;

    case "542C":
      this.channels=542;
      break;

    case "543C":
      this.channels=543;
      break;

    case "544C":
      this.channels=544;
      break;

    case "545C":
      this.channels=545;
      break;

    case "546C":
      this.channels=546;
      break;

    case "547C":
      this.channels=547;
      break;

    case "548C":
      this.channels=548;
      break;

    case "549C":
      this.channels=549;
      break;

    case "550C":
      this.channels=550;
      break;

    case "551C":
      this.channels=551;
      break;

    case "552C":
      this.channels=552;
      break;

    case "553C":
      this.channels=553;
      break;

    case "554C":
      this.channels=554;
      break;

    case "555C":
      this.channels=555;
      break;

    case "556C":
      this.channels=556;
      break;

    case "557C":
      this.channels=557;
      break;

    case "558C":
      this.channels=558;
      break;

    case "559C":
      this.channels=559;
      break;

    case "560C":
      this.channels=560;
      break;

    case "561C":
      this.channels=561;
      break;

    case "562C":
      this.channels=562;
      break;

    case "563C":
      this.channels=563;
      break;

    case "564C":
      this.channels=564;
      break;

    case "565C":
      this.channels=565;
      break;

    case "566C":
      this.channels=566;
      break;

    case "567C":
      this.channels=567;
      break;

    case "568C":
      this.channels=568;
      break;

    case "569C":
      this.channels=569;
      break;

    case "570C":
      this.channels=570;
      break;

    case "571C":
      this.channels=571;
      break;

    case "572C":
      this.channels=572;
      break;

    case "573C":
      this.channels=573;
      break;

    case "574C":
      this.channels=574;
      break;

    case "575C":
      this.channels=575;
      break;

    case "576C":
      this.channels=576;
      break;

    case "577C":
      this.channels=577;
      break;

    case "578C":
      this.channels=578;
      break;

    case "579C":
      this.channels=579;
      break;

    case "580C":
      this.channels=580;
      break;

    case "581C":
      this.channels=581;
      break;

    case "582C":
      this.channels=582;
      break;

    case "583C":
      this.channels=583;
      break;

    case "584C":
      this.channels=584;
      break;

    case "585C":
      this.channels=585;
      break;

    case "586C":
      this.channels=586;
      break;

    case "587C":
      this.channels=587;
      break;

    case "588C":
      this.channels=588;
      break;

    case "589C":
      this.channels=589;
      break;

    case "590C":
      this.channels=590;
      break;

    case "591C":
      this.channels=591;
      break;

    case "592C":
      this.channels=592;
      break;

    case "593C":
      this.channels=593;
      break;

    case "594C":
      this.channels=594;
      break;

    case "595C":
      this.channels=595;
      break;

    case "596C":
      this.channels=596;
      break;

    case "597C":
      this.channels=597;
      break;

    case "598C":
      this.channels=598;
      break;

    case "599C":
      this.channels=599;
      break;

    case "600C":
      this.channels=600;
      break;

    case "601C":
      this.channels=601;
      break;

    case "602C":
      this.channels=602;
      break;

    case "603C":
      this.channels=603;
      break;

    case "604C":
      this.channels=604;
      break;

    case "605C":
      this.channels=605;
      break;

    case "606C":
      this.channels=606;
      break;

    case "607C":
      this.channels=607;
      break;

    case "608C":
      this.channels=608;
      break;

    case "609C":
      this.channels=609;
      break;

    case "610C":
      this.channels=610;
      break;

    case "611C":
      this.channels=611;
      break;

    case "612C":
      this.channels=612;
      break;

    case "613C":
      this.channels=613;
      break;

    case "614C":
      this.channels=614;
      break;

    case "615C":
      this.channels=615;
      break;

    case "616C":
      this.channels=616;
      break;

    case "617C":
      this.channels=617;
      break;

    case "618C":
      this.channels=618;
      break;

    case "619C":
      this.channels=619;
      break;

    case "620C":
      this.channels=620;
      break;

    case "621C":
      this.channels=621;
      break;

    case "622C":
      this.channels=622;
      break;

    case "623C":
      this.channels=623;
      break;

    case "624C":
      this.channels=624;
      break;

    case "625C":
      this.channels=625;
      break;

    case "626C":
      this.channels=626;
      break;

    case "627C":
      this.channels=627;
      break;

    case "628C":
      this.channels=628;
      break;

    case "629C":
      this.channels=629;
      break;

    case "630C":
      this.channels=630;
      break;

    case "631C":
      this.channels=631;
      break;

    case "632C":
      this.channels=632;
      break;

    case "633C":
      this.channels=633;
      break;

    case "634C":
      this.channels=634;
      break;

    case "635C":
      this.channels=635;
      break;

    case "636C":
      this.channels=636;
      break;

    case "637C":
      this.channels=637;
      break;

    case "638C":
      this.channels=638;
      break;

    case "639C":
      this.channels=639;
      break;

    case "640C":
      this.channels=640;
      break;

    case "641C":
      this.channels=641;
      break;

    case "642C":
      this.channels=642;
      break;

    case "643C":
      this.channels=643;
      break;

    case "644C":
      this.channels=644;
      break;

    case "645C":
      this.channels=645;
      break;

    case "646C":
      this.channels=646;
      break;

    case "647C":
      this.channels=647;
      break;

    case "648C":
      this.channels=648;
      break;

    case "649C":
      this.channels=649;
      break;

    case "650C":
      this.channels=650;
      break;

    case "651C":
      this.channels=651;
      break;

    case "652C":
      this.channels=652;
      break;

    case "653C":
      this.channels=653;
      break;

    case "654C":
      this.channels=654;
      break;

    case "655C":
      this.channels=655;
      break;

    case "656C":
      this.channels=656;
      break;

    case "657C":
      this.channels=657;
      break;

    case "658C":
      this.channels=658;
      break;

    case "659C":
      this.channels=659;
      break;

    case "660C":
      this.channels=660;
      break;

    case "661C":
      this.channels=661;
      break;

    case "662C":
      this.channels=662;
      break;

    case "663C":
      this.channels=663;
      break;

    case "664C":
      this.channels=664;
      break;

    case "665C":
      this.channels=665;
      break;

    case "666C":
      this.channels=666;
      break;

    case "667C":
      this.channels=667;
      break;

    case "668C":
      this.channels=668;
      break;

    case "669C":
      this.channels=669;
      break;

    case "670C":
      this.channels=670;
      break;

    case "671C":
      this.channels=671;
      break;

    case "672C":
      this.channels=672;
      break;

    case "673C":
      this.channels=673;
      break;

    case "674C":
      this.channels=674;
      break;

    case "675C":
      this.channels=675;
      break;

    case "676C":
      this.channels=676;
      break;

    case "677C":
      this.channels=677;
      break;

    case "678C":
      this.channels=678;
      break;

    case "679C":
      this.channels=679;
      break;

    case "680C":
      this.channels=680;
      break;

    case "681C":
      this.channels=681;
      break;

    case "682C":
      this.channels=682;
      break;

    case "683C":
      this.channels=683;
      break;

    case "684C":
      this.channels=684;
      break;

    case "685C":
      this.channels=685;
      break;

    case "686C":
      this.channels=686;
      break;

    case "687C":
      this.channels=687;
      break;

    case "688C":
      this.channels=688;
      break;

    case "689C":
      this.channels=689;
      break;

    case "690C":
      this.channels=690;
      break;

    case "691C":
      this.channels=691;
      break;

    case "692C":
      this.channels=692;
      break;

    case "693C":
      this.channels=693;
      break;

    case "694C":
      this.channels=694;
      break;

    case "695C":
      this.channels=695;
      break;

    case "696C":
      this.channels=696;
      break;

    case "697C":
      this.channels=697;
      break;

    case "698C":
      this.channels=698;
      break;

    case "699C":
      this.channels=699;
      break;

    case "700C":
      this.channels=700;
      break;

    case "701C":
      this.channels=701;
      break;

    case "702C":
      this.channels=702;
      break;

    case "703C":
      this.channels=703;
      break;

    case "704C":
      this.channels=704;
      break;

    case "705C":
      this.channels=705;
      break;

    case "706C":
      this.channels=706;
      break;

    case "707C":
      this.channels=707;
      break;

    case "708C":
      this.channels=708;
      break;

    case "709C":
      this.channels=709;
      break;

    case "710C":
      this.channels=710;
      break;

    case "711C":
      this.channels=711;
      break;

    case "712C":
      this.channels=712;
      break;

    case "713C":
      this.channels=713;
      break;

    case "714C":
      this.channels=714;
      break;

    case "715C":
      this.channels=715;
      break;

    case "716C":
      this.channels=716;
      break;

    case "717C":
      this.channels=717;
      break;

    case "718C":
      this.channels=718;
      break;

    case "719C":
      this.channels=719;
      break;

    case "720C":
      this.channels=720;
      break;

    case "721C":
      this.channels=721;
      break;

    case "722C":
      this.channels=722;
      break;

    case "723C":
      this.channels=723;
      break;

    case "724C":
      this.channels=724;
      break;

    case "725C":
      this.channels=725;
      break;

    case "726C":
      this.channels=726;
      break;

    case "727C":
      this.channels=727;
      break;

    case "728C":
      this.channels=728;
      break;

    case "729C":
      this.channels=729;
      break;

    case "730C":
      this.channels=730;
      break;

    case "731C":
      this.channels=731;
      break;

    case "732C":
      this.channels=732;
      break;

    case "733C":
      this.channels=733;
      break;

    case "734C":
      this.channels=734;
      break;

    case "735C":
      this.channels=735;
      break;

    case "736C":
      this.channels=736;
      break;

    case "737C":
      this.channels=737;
      break;

    case "738C":
      this.channels=738;
      break;

    case "739C":
      this.channels=739;
      break;

    case "740C":
      this.channels=740;
      break;

    case "741C":
      this.channels=741;
      break;

    case "742C":
      this.channels=742;
      break;

    case "743C":
      this.channels=743;
      break;

    case "744C":
      this.channels=744;
      break;

    case "745C":
      this.channels=745;
      break;

    case "746C":
      this.channels=746;
      break;

    case "747C":
      this.channels=747;
      break;

    case "748C":
      this.channels=748;
      break;

    case "749C":
      this.channels=749;
      break;

    case "750C":
      this.channels=750;
      break;

    case "751C":
      this.channels=751;
      break;

    case "752C":
      this.channels=752;
      break;

    case "753C":
      this.channels=753;
      break;

    case "754C":
      this.channels=754;
      break;

    case "755C":
      this.channels=755;
      break;

    case "756C":
      this.channels=756;
      break;

    case "757C":
      this.channels=757;
      break;

    case "758C":
      this.channels=758;
      break;

    case "759C":
      this.channels=759;
      break;

    case "760C":
      this.channels=760;
      break;

    case "761C":
      this.channels=761;
      break;

    case "762C":
      this.channels=762;
      break;

    case "763C":
      this.channels=763;
      break;

    case "764C":
      this.channels=764;
      break;

    case "765C":
      this.channels=765;
      break;

    case "766C":
      this.channels=766;
      break;

    case "767C":
      this.channels=767;
      break;

    case "768C":
      this.channels=768;
      break;

    case "769C":
      this.channels=769;
      break;

    case "770C":
      this.channels=770;
      break;

    case "771C":
      this.channels=771;
      break;

    case "772C":
      this.channels=772;
      break;

    case "773C":
      this.channels=773;
      break;

    case "774C":
      this.channels=774;
      break;

    case "775C":
      this.channels=775;
      break;

    case "776C":
      this.channels=776;
      break;

    case "777C":
      this.channels=777;
      break;

    case "778C":
      this.channels=778;
      break;

    case "779C":
      this.channels=779;
      break;

    case "780C":
      this.channels=780;
      break;

    case "781C":
      this.channels=781;
      break;

    case "782C":
      this.channels=782;
      break;

    case "783C":
      this.channels=783;
      break;

    case "784C":
      this.channels=784;
      break;

    case "785C":
      this.channels=785;
      break;

    case "786C":
      this.channels=786;
      break;

    case "787C":
      this.channels=787;
      break;

    case "788C":
      this.channels=788;
      break;

    case "789C":
      this.channels=789;
      break;

    case "790C":
      this.channels=790;
      break;

    case "791C":
      this.channels=791;
      break;

    case "792C":
      this.channels=792;
      break;

    case "793C":
      this.channels=793;
      break;

    case "794C":
      this.channels=794;
      break;

    case "795C":
      this.channels=795;
      break;

    case "796C":
      this.channels=796;
      break;

    case "797C":
      this.channels=797;
      break;

    case "798C":
      this.channels=798;
      break;

    case "799C":
      this.channels=799;
      break;

    case "800C":
      this.channels=800;
      break;

    case "801C":
      this.channels=801;
      break;

    case "802C":
      this.channels=802;
      break;

    case "803C":
      this.channels=803;
      break;

    case "804C":
      this.channels=804;
      break;

    case "805C":
      this.channels=805;
      break;

    case "806C":
      this.channels=806;
      break;

    case "807C":
      this.channels=807;
      break;

    case "808C":
      this.channels=808;
      break;

    case "809C":
      this.channels=809;
      break;

    case "810C":
      this.channels=810;
      break;

    case "811C":
      this.channels=811;
      break;

    case "812C":
      this.channels=812;
      break;

    case "813C":
      this.channels=813;
      break;

    case "814C":
      this.channels=814;
      break;

    case "815C":
      this.channels=815;
      break;

    case "816C":
      this.channels=816;
      break;

    case "817C":
      this.channels=817;
      break;

    case "818C":
      this.channels=818;
      break;

    case "819C":
      this.channels=819;
      break;

    case "820C":
      this.channels=820;
      break;

    case "821C":
      this.channels=821;
      break;

    case "822C":
      this.channels=822;
      break;

    case "823C":
      this.channels=823;
      break;

    case "824C":
      this.channels=824;
      break;

    case "825C":
      this.channels=825;
      break;

    case "826C":
      this.channels=826;
      break;

    case "827C":
      this.channels=827;
      break;

    case "828C":
      this.channels=828;
      break;

    case "829C":
      this.channels=829;
      break;

    case "830C":
      this.channels=830;
      break;

    case "831C":
      this.channels=831;
      break;

    case "832C":
      this.channels=832;
      break;

    case "833C":
      this.channels=833;
      break;

    case "834C":
      this.channels=834;
      break;

    case "835C":
      this.channels=835;
      break;

    case "836C":
      this.channels=836;
      break;

    case "837C":
      this.channels=837;
      break;

    case "838C":
      this.channels=838;
      break;

    case "839C":
      this.channels=839;
      break;

    case "840C":
      this.channels=840;
      break;

    case "841C":
      this.channels=841;
      break;

    case "842C":
      this.channels=842;
      break;

    case "843C":
      this.channels=843;
      break;

    case "844C":
      this.channels=844;
      break;

    case "845C":
      this.channels=845;
      break;

    case "846C":
      this.channels=846;
      break;

    case "847C":
      this.channels=847;
      break;

    case "848C":
      this.channels=848;
      break;

    case "849C":
      this.channels=849;
      break;

    case "850C":
      this.channels=850;
      break;

    case "851C":
      this.channels=851;
      break;

    case "852C":
      this.channels=852;
      break;

    case "853C":
      this.channels=853;
      break;

    case "854C":
      this.channels=854;
      break;

    case "855C":
      this.channels=855;
      break;

    case "856C":
      this.channels=856;
      break;

    case "857C":
      this.channels=857;
      break;

    case "858C":
      this.channels=858;
      break;

    case "859C":
      this.channels=859;
      break;

    case "860C":
      this.channels=860;
      break;

    case "861C":
      this.channels=861;
      break;

    case "862C":
      this.channels=862;
      break;

    case "863C":
      this.channels=863;
      break;

    case "864C":
      this.channels=864;
      break;

    case "865C":
      this.channels=865;
      break;

    case "866C":
      this.channels=866;
      break;

    case "867C":
      this.channels=867;
      break;

    case "868C":
      this.channels=868;
      break;

    case "869C":
      this.channels=869;
      break;

    case "870C":
      this.channels=870;
      break;

    case "871C":
      this.channels=871;
      break;

    case "872C":
      this.channels=872;
      break;

    case "873C":
      this.channels=873;
      break;

    case "874C":
      this.channels=874;
      break;

    case "875C":
      this.channels=875;
      break;

    case "876C":
      this.channels=876;
      break;

    case "877C":
      this.channels=877;
      break;

    case "878C":
      this.channels=878;
      break;

    case "879C":
      this.channels=879;
      break;

    case "880C":
      this.channels=880;
      break;

    case "881C":
      this.channels=881;
      break;

    case "882C":
      this.channels=882;
      break;

    case "883C":
      this.channels=883;
      break;

    case "884C":
      this.channels=884;
      break;

    case "885C":
      this.channels=885;
      break;

    case "886C":
      this.channels=886;
      break;

    case "887C":
      this.channels=887;
      break;

    case "888C":
      this.channels=888;
      break;

    case "889C":
      this.channels=889;
      break;

    case "890C":
      this.channels=890;
      break;

    case "891C":
      this.channels=891;
      break;

    case "892C":
      this.channels=892;
      break;

    case "893C":
      this.channels=893;
      break;

    case "894C":
      this.channels=894;
      break;

    case "895C":
      this.channels=895;
      break;

    case "896C":
      this.channels=896;
      break;

    case "897C":
      this.channels=897;
      break;

    case "898C":
      this.channels=898;
      break;

    case "899C":
      this.channels=899;
      break;

    case "900C":
      this.channels=900;
      break;

    case "901C":
      this.channels=901;
      break;

    case "902C":
      this.channels=902;
      break;

    case "903C":
      this.channels=903;
      break;

    case "904C":
      this.channels=904;
      break;

    case "905C":
      this.channels=905;
      break;

    case "906C":
      this.channels=906;
      break;

    case "907C":
      this.channels=907;
      break;

    case "908C":
      this.channels=908;
      break;

    case "909C":
      this.channels=909;
      break;

    case "910C":
      this.channels=910;
      break;

    case "911C":
      this.channels=911;
      break;

    case "912C":
      this.channels=912;
      break;

    case "913C":
      this.channels=913;
      break;

    case "914C":
      this.channels=914;
      break;

    case "915C":
      this.channels=915;
      break;

    case "916C":
      this.channels=916;
      break;

    case "917C":
      this.channels=917;
      break;

    case "918C":
      this.channels=918;
      break;

    case "919C":
      this.channels=919;
      break;

    case "920C":
      this.channels=920;
      break;

    case "921C":
      this.channels=921;
      break;

    case "922C":
      this.channels=922;
      break;

    case "923C":
      this.channels=923;
      break;

    case "924C":
      this.channels=924;
      break;

    case "925C":
      this.channels=925;
      break;

    case "926C":
      this.channels=926;
      break;

    case "927C":
      this.channels=927;
      break;

    case "928C":
      this.channels=928;
      break;

    case "929C":
      this.channels=929;
      break;

    case "930C":
      this.channels=930;
      break;

    case "931C":
      this.channels=931;
      break;

    case "932C":
      this.channels=932;
      break;

    case "933C":
      this.channels=933;
      break;

    case "934C":
      this.channels=934;
      break;

    case "935C":
      this.channels=935;
      break;

    case "936C":
      this.channels=936;
      break;

    case "937C":
      this.channels=937;
      break;

    case "938C":
      this.channels=938;
      break;

    case "939C":
      this.channels=939;
      break;

    case "940C":
      this.channels=940;
      break;

    case "941C":
      this.channels=941;
      break;

    case "942C":
      this.channels=942;
      break;

    case "943C":
      this.channels=943;
      break;

    case "944C":
      this.channels=944;
      break;

    case "945C":
      this.channels=945;
      break;

    case "946C":
      this.channels=946;
      break;

    case "947C":
      this.channels=947;
      break;

    case "948C":
      this.channels=948;
      break;

    case "949C":
      this.channels=949;
      break;

    case "950C":
      this.channels=950;
      break;

    case "951C":
      this.channels=951;
      break;

    case "952C":
      this.channels=952;
      break;

    case "953C":
      this.channels=953;
      break;

    case "954C":
      this.channels=954;
      break;

    case "955C":
      this.channels=955;
      break;

    case "956C":
      this.channels=956;
      break;

    case "957C":
      this.channels=957;
      break;

    case "958C":
      this.channels=958;
      break;

    case "959C":
      this.channels=959;
      break;

    case "960C":
      this.channels=960;
      break;

    case "961C":
      this.channels=961;
      break;

    case "962C":
      this.channels=962;
      break;

    case "963C":
      this.channels=963;
      break;

    case "964C":
      this.channels=964;
      break;

    case "965C":
      this.channels=965;
      break;

    case "966C":
      this.channels=966;
      break;

    case "967C":
      this.channels=967;
      break;

    case "968C":
      this.channels=968;
      break;

    case "969C":
      this.channels=969;
      break;

    case "970C":
      this.channels=970;
      break;

    case "971C":
      this.channels=971;
      break;

    case "972C":
      this.channels=972;
      break;

    case "973C":
      this.channels=973;
      break;

    case "974C":
      this.channels=974;
      break;

    case "975C":
      this.channels=975;
      break;

    case "976C":
      this.channels=976;
      break;

    case "977C":
      this.channels=977;
      break;

    case "978C":
      this.channels=978;
      break;

    case "979C":
      this.channels=979;
      break;

    case "980C":
      this.channels=980;
      break;

    case "981C":
      this.channels=981;
      break;

    case "982C":
      this.channels=982;
      break;

    case "983C":
      this.channels=983;
      break;

    case "984C":
      this.channels=984;
      break;

    case "985C":
      this.channels=985;
      break;

    case "986C":
      this.channels=986;
      break;

    case "987C":
      this.channels=987;
      break;

    case "988C":
      this.channels=988;
      break;

    case "989C":
      this.channels=989;
      break;

    case "990C":
      this.channels=990;
      break;

    case "991C":
      this.channels=991;
      break;

    case "992C":
      this.channels=992;
      break;

    case "993C":
      this.channels=993;
      break;

    case "994C":
      this.channels=994;
      break;

    case "995C":
      this.channels=995;
      break;

    case "996C":
      this.channels=996;
      break;

    case "997C":
      this.channels=997;
      break;

    case "998C":
      this.channels=998;
      break;

    case "999C":
      this.channels=999;
      break;

    default:
      return false;
  }
  this.chvu=new Array();
  for(i=0;i<this.channels;i++) this.chvu[i]=0.0;

  i=0;
  while(buffer[i] && i<20)
    this.title=this.title+String.fromCharCode(buffer[i++]);

  for(i=0;i<this.samples;i++) {
    var st=20+i*30;
    j=0;
    while(buffer[st+j] && j<22) {
      this.sample[i].name+=
        ((buffer[st+j]>0x1f) && (buffer[st+j]<0x7f)) ?
        (String.fromCharCode(buffer[st+j])) :
        (" ");
      j++;
    }
    this.sample[i].length=2*(buffer[st+22]*256 + buffer[st+23]);
    this.sample[i].finetune=buffer[st+24];
    if (this.sample[i].finetune > 7) this.sample[i].finetune=this.sample[i].finetune-16;
    this.sample[i].volume=buffer[st+25];
    this.sample[i].loopstart=2*(buffer[st+26]*256 + buffer[st+27]);
    this.sample[i].looplength=2*(buffer[st+28]*256 + buffer[st+29]);
    if (this.sample[i].looplength==2) this.sample[i].looplength=0;
    if (this.sample[i].loopstart>this.sample[i].length) {
      this.sample[i].loopstart=0;
      this.sample[i].looplength=0;
    }
  }

  this.songlen=buffer[950];
  if (buffer[951] != 127) this.repeatpos=buffer[951];
  for(i=0;i<128;i++) {
    this.patterntable[i]=buffer[952+i];
    if (this.patterntable[i] > this.patterns) this.patterns=this.patterntable[i];
  }
  this.patterns+=1;
  var patlen=4*64*this.channels;

  this.pattern=new Array();
  this.note=new Array();
  this.pattern_unpack=new Array();
  for(i=0;i<this.patterns;i++) {
    this.pattern[i]=new Uint8Array(patlen);
    this.note[i]=new Uint8Array(this.channels*64);
    this.pattern_unpack[i]=new Uint8Array(this.channels*64*5);
    for(j=0;j<patlen;j++) this.pattern[i][j]=buffer[1084+i*patlen+j];
    for(j=0;j<64;j++) for(c=0;c<this.channels;c++) {
      this.note[i][j*this.channels+c]=0;
      var n=(this.pattern[i][j*4*this.channels+c*4]&0x0f)<<8 | this.pattern[i][j*4*this.channels+c*4+1];
      for(var np=0; np<this.baseperiodtable.length; np++)
        if (n==this.baseperiodtable[np]) this.note[i][j*this.channels+c]=np;
    }
    for(j=0;j<64;j++) {
      for(c=0;c<this.channels;c++) {
        var pp= j*4*this.channels+c*4;
        var ppu=j*5*this.channels+c*5;
        var n=(this.pattern[i][pp]&0x0f)<<8 | this.pattern[i][pp+1];
        if (n) { n=this.note[i][j*this.channels+c]; n=(n%12)|(Math.floor(n/12)+2)<<4; }
        this.pattern_unpack[i][ppu+0]=(n)?n:255;
        this.pattern_unpack[i][ppu+1]=this.pattern[i][pp+0]&0xf0 | this.pattern[i][pp+2]>>4;
        this.pattern_unpack[i][ppu+2]=255;
        this.pattern_unpack[i][ppu+3]=this.pattern[i][pp+2]&0x0f;
        this.pattern_unpack[i][ppu+4]=this.pattern[i][pp+3];
      }
    }
  }

  var sst=1084+this.patterns*patlen;
  for(i=0;i<this.samples;i++) {
    this.sample[i].data=new Float32Array(this.sample[i].length);
    for(j=0;j<this.sample[i].length;j++) {
      var q=buffer[sst+j];
      if (q<128) {
        q=q/128.0;
      } else {
        q=((q-128)/128.0)-1.0;
      }
      this.sample[i].data[j]=q;
    }
    sst+=this.sample[i].length;
  }

  // look ahead at very first row to see if filter gets enabled
  this.filter=false;
  for(var ch=0;ch<this.channels;ch++)
  {
    p=this.patterntable[0];
    pp=ch*4;
    var cmd=this.pattern[p][pp+2]&0x0f, data=this.pattern[p][pp+3];
    if (cmd==0x0e && ((data&0xf0)==0x00)) {
      if (!(data&0x01)) {
        this.filter=true;
      } else {
        this.filter=false;
      }
    }
  }

  // set lowpass cutoff
  if (this.context) {
    if (this.filter) {
      this.lowpassNode.frequency.value=3275;
    } else {
      this.lowpassNode.frequency.value=28867;
    }
  }

  this.chvu=new Float32Array(this.channels);
  for(i=0;i<this.channels;i++) this.chvu[i]=0.0;

  return true;
}



// advance player
Protracker.prototype.advance = function(mod) {
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
  if (mod.row>=64) { mod.position++; mod.row=0; mod.flags|=4; }
  if (mod.position>=mod.songlen) {
    if (mod.repeat) {
      mod.position=0;
    } else {
      this.endofsong=true;
      //mod.stop();
    }
    return;
  }
}



// mix an audio buffer with data
Protracker.prototype.mix = function(mod, bufs, buflen) {
  var f;
  var p, pp, n, nn;

  var outp=new Float32Array(2);
  for(var s=0;s<buflen;s++)
  {
    outp[0]=0.0;
    outp[1]=0.0;

    if (!mod.paused && !mod.endofsong && mod.playing)
    {
      mod.advance(mod);

      var och=0;
      for(var ch=0;ch<mod.channels;ch++)
      {

        // calculate playback position
        p=mod.patterntable[mod.position];
        pp=mod.row*4*mod.channels + ch*4;
        if (mod.flags&2) { // new row
          mod.channel[ch].command=mod.pattern[p][pp+2]&0x0f;
          mod.channel[ch].data=mod.pattern[p][pp+3];

          if (!(mod.channel[ch].command==0x0e && (mod.channel[ch].data&0xf0)==0xd0)) {
            n=(mod.pattern[p][pp]&0x0f)<<8 | mod.pattern[p][pp+1];
            if (n) {
              // noteon, except if command=3 (porta to note)
              if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
                mod.channel[ch].period=n;
                mod.channel[ch].samplepos=0;
                if (mod.channel[ch].vibratowave>3) mod.channel[ch].vibratopos=0;
                mod.channel[ch].flags|=3; // recalc speed
                mod.channel[ch].noteon=1;
              }
              // in either case, set the slide to note target
              mod.channel[ch].slideto=n;
            }
            nn=mod.pattern[p][pp+0]&0xf0 | mod.pattern[p][pp+2]>>4;
            if (nn) {
              mod.channel[ch].sample=nn-1;
              mod.channel[ch].volume=mod.sample[nn-1].volume;
              if (!n && (mod.channel[ch].samplepos > mod.sample[nn-1].length)) mod.channel[ch].samplepos=0;
            }
          }
        }
        mod.channel[ch].voiceperiod=mod.channel[ch].period;

        // kill empty samples
        if (!mod.sample[mod.channel[ch].sample].length) mod.channel[ch].noteon=0;

        // effects
        if (mod.flags&1) {
          if (!mod.tick) {
            // process only on tick 0
            mod.effects_t0[mod.channel[ch].command](mod, ch);
          } else {
            mod.effects_t1[mod.channel[ch].command](mod, ch);
          }
        }

        // recalc note number from period
        if (mod.channel[ch].flags&2) {
          for(var np=0; np<mod.baseperiodtable.length; np++)
            if (mod.baseperiodtable[np]>=mod.channel[ch].period) mod.channel[ch].note=np;
          mod.channel[ch].semitone=7;
          if (mod.channel[ch].period>=120)
            mod.channel[ch].semitone=mod.baseperiodtable[mod.channel[ch].note]-mod.baseperiodtable[mod.channel[ch].note+1];
        }

        // recalc sample speed and apply finetune
        if ((mod.channel[ch].flags&1 || mod.flags&2) && mod.channel[ch].voiceperiod)
          mod.channel[ch].samplespeed=
            7093789.2/(mod.channel[ch].voiceperiod*2) * mod.finetunetable[mod.sample[mod.channel[ch].sample].finetune+8] / mod.samplerate;

        // advance vibrato on each new tick
        if (mod.flags&1) {
          mod.channel[ch].vibratopos+=mod.channel[ch].vibratospeed;
          mod.channel[ch].vibratopos&=0x3f;
        }

        // mix channel to output
        och=och^(ch&1);
        f=0.0;
        if (mod.channel[ch].noteon) {
          if (mod.sample[mod.channel[ch].sample].length > mod.channel[ch].samplepos)
            f=(mod.sample[mod.channel[ch].sample].data[Math.floor(mod.channel[ch].samplepos)]*mod.channel[ch].volume)/64.0;
          outp[och]+=f;
          mod.channel[ch].samplepos+=mod.channel[ch].samplespeed;
        }
        mod.chvu[ch]=Math.max(mod.chvu[ch], Math.abs(f));

        // loop or end samples
        if (mod.channel[ch].noteon) {
          if (mod.sample[mod.channel[ch].sample].loopstart || mod.sample[mod.channel[ch].sample].looplength) {
            if (mod.channel[ch].samplepos >= (mod.sample[mod.channel[ch].sample].loopstart+mod.sample[mod.channel[ch].sample].looplength)) {
              mod.channel[ch].samplepos-=mod.sample[mod.channel[ch].sample].looplength;
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

    // done - store to output buffer
    bufs[0][s]=outp[0];
    bufs[1][s]=outp[1];
  }
}



//
// tick 0 effect functions
//
Protracker.prototype.effect_t0_0=function(mod, ch) { // 0 arpeggio
  mod.channel[ch].arpeggio=mod.channel[ch].data;
}
Protracker.prototype.effect_t0_1=function(mod, ch) { // 1 slide up
  if (mod.channel[ch].data) mod.channel[ch].slidespeed=mod.channel[ch].data;
}
Protracker.prototype.effect_t0_2=function(mod, ch) { // 2 slide down
  if (mod.channel[ch].data) mod.channel[ch].slidespeed=mod.channel[ch].data;
}
Protracker.prototype.effect_t0_3=function(mod, ch) { // 3 slide to note
  if (mod.channel[ch].data) mod.channel[ch].slidetospeed=mod.channel[ch].data;
}
Protracker.prototype.effect_t0_4=function(mod, ch) { // 4 vibrato
  if (mod.channel[ch].data&0x0f && mod.channel[ch].data&0xf0) {
    mod.channel[ch].vibratodepth=(mod.channel[ch].data&0x0f);
    mod.channel[ch].vibratospeed=(mod.channel[ch].data&0xf0)>>4;
  }
  mod.effects_t1[4](mod, ch);
}
Protracker.prototype.effect_t0_5=function(mod, ch) { // 5
}
Protracker.prototype.effect_t0_6=function(mod, ch) { // 6
}
Protracker.prototype.effect_t0_7=function(mod, ch) { // 7
}
Protracker.prototype.effect_t0_8=function(mod, ch) { // 8 unused, used for syncing
  mod.syncqueue.unshift(mod.channel[ch].data&0x0f);
}
Protracker.prototype.effect_t0_9=function(mod, ch) { // 9 set sample offset
  mod.channel[ch].samplepos=mod.channel[ch].data*256;
}
Protracker.prototype.effect_t0_a=function(mod, ch) { // a
}
Protracker.prototype.effect_t0_b=function(mod, ch) { // b pattern jump
  mod.breakrow=0;
  mod.patternjump=mod.channel[ch].data;
  mod.flags|=16;
}
Protracker.prototype.effect_t0_c=function(mod, ch) { // c set volume
  mod.channel[ch].volume=mod.channel[ch].data;
}
Protracker.prototype.effect_t0_d=function(mod, ch) { // d pattern break
  mod.breakrow=((mod.channel[ch].data&0xf0)>>4)*10 + (mod.channel[ch].data&0x0f);
  if (!(mod.flags&16)) mod.patternjump=mod.position+1;
  mod.flags|=16;
}
Protracker.prototype.effect_t0_e=function(mod, ch) { // e
  var i=(mod.channel[ch].data&0xf0)>>4;
  mod.effects_t0_e[i](mod, ch);
}
Protracker.prototype.effect_t0_f=function(mod, ch) { // f set speed
  if (mod.channel[ch].data > 32) {
    mod.bpm=mod.channel[ch].data;
  } else {
    if (mod.channel[ch].data) mod.speed=mod.channel[ch].data;
  }
}



//
// tick 0 effect e functions
//
Protracker.prototype.effect_t0_e0=function(mod, ch) { // e0 filter on/off
  if (mod.channel[ch].data&0x00) {
    mod.filter=true;
  } else {
    mod.filter=false;
  }
}
Protracker.prototype.effect_t0_e1=function(mod, ch) { // e1 fine slide up
  mod.channel[ch].period-=mod.channel[ch].data&0x0f;
  if (mod.channel[ch].period < 113) mod.channel[ch].period=113;
}
Protracker.prototype.effect_t0_e2=function(mod, ch) { // e2 fine slide down
  mod.channel[ch].period+=mod.channel[ch].data&0x0f;
  if (mod.channel[ch].period > 856) mod.channel[ch].period=856;
  mod.channel[ch].flags|=1;
}
Protracker.prototype.effect_t0_e3=function(mod, ch) { // e3 set glissando
}
Protracker.prototype.effect_t0_e4=function(mod, ch) { // e4 set vibrato waveform
  mod.channel[ch].vibratowave=mod.channel[ch].data&0x07;
}
Protracker.prototype.effect_t0_e5=function(mod, ch) { // e5 set finetune
}
Protracker.prototype.effect_t0_e6=function(mod, ch) { // e6 loop pattern
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
Protracker.prototype.effect_t0_e7=function(mod, ch) { // e7
}
Protracker.prototype.effect_t0_e8=function(mod, ch) { // e8, use for syncing
  mod.syncqueue.unshift(mod.channel[ch].data&0x0f);
}
Protracker.prototype.effect_t0_e9=function(mod, ch) { // e9
}
Protracker.prototype.effect_t0_ea=function(mod, ch) { // ea fine volslide up
  mod.channel[ch].volume+=mod.channel[ch].data&0x0f;
  if (mod.channel[ch].volume > 64) mod.channel[ch].volume=64;
}
Protracker.prototype.effect_t0_eb=function(mod, ch) { // eb fine volslide down
  mod.channel[ch].volume-=mod.channel[ch].data&0x0f;
  if (mod.channel[ch].volume < 0) mod.channel[ch].volume=0;
}
Protracker.prototype.effect_t0_ec=function(mod, ch) { // ec cut sample
  if (mod.tick==(mod.channel[ch].data&0x0f)) mod.channel[ch].volume=0;
}
Protracker.prototype.effect_t0_ed=function(mod, ch) { // ed delay sample
  if (mod.tick==(mod.channel[ch].data&0x0f)) {
    // start note
    var p=mod.patterntable[mod.position];
    var pp=mod.row*4*mod.channels + ch*4;
    n=(mod.pattern[p][pp]&0x0f)<<8 | mod.pattern[p][pp+1];
    if (n) {
      mod.channel[ch].period=n;
      mod.channel[ch].voiceperiod=mod.channel[ch].period;
      mod.channel[ch].samplepos=0;
      if (mod.channel[ch].vibratowave>3) mod.channel[ch].vibratopos=0;
      mod.channel[ch].flags|=3; // recalc speed
      mod.channel[ch].noteon=1;
    }
    n=mod.pattern[p][pp+0]&0xf0 | mod.pattern[p][pp+2]>>4;
    if (n) {
      mod.channel[ch].sample=n-1;
      mod.channel[ch].volume=mod.sample[n-1].volume;
    }
  }
}
Protracker.prototype.effect_t0_ee=function(mod, ch) { // ee delay pattern
  mod.patterndelay=mod.channel[ch].data&0x0f;
  mod.patternwait=1;
}
Protracker.prototype.effect_t0_ef=function(mod, ch) { // ef
}



//
// tick 1+ effect functions
//
Protracker.prototype.effect_t1_0=function(mod, ch) { // 0 arpeggio
  if (mod.channel[ch].data) {
    var apn=mod.channel[ch].note;
    if ((mod.tick%3)==1) apn+=mod.channel[ch].arpeggio>>4;
    if ((mod.tick%3)==2) apn+=mod.channel[ch].arpeggio&0x0f;
    if (apn>=0 && apn <= mod.baseperiodtable.length)
      mod.channel[ch].voiceperiod = mod.baseperiodtable[apn];
    mod.channel[ch].flags|=1;
  }
}
Protracker.prototype.effect_t1_1=function(mod, ch) { // 1 slide up
  mod.channel[ch].period-=mod.channel[ch].slidespeed;
  if (mod.channel[ch].period<113) mod.channel[ch].period=113;
  mod.channel[ch].flags|=3; // recalc speed
}
Protracker.prototype.effect_t1_2=function(mod, ch) { // 2 slide down
  mod.channel[ch].period+=mod.channel[ch].slidespeed;
  if (mod.channel[ch].period>856) mod.channel[ch].period=856;
  mod.channel[ch].flags|=3; // recalc speed
}
Protracker.prototype.effect_t1_3=function(mod, ch) { // 3 slide to note
  if (mod.channel[ch].period < mod.channel[ch].slideto) {
    mod.channel[ch].period+=mod.channel[ch].slidetospeed;
    if (mod.channel[ch].period > mod.channel[ch].slideto)
      mod.channel[ch].period=mod.channel[ch].slideto;
  }
  if (mod.channel[ch].period > mod.channel[ch].slideto) {
    mod.channel[ch].period-=mod.channel[ch].slidetospeed;
    if (mod.channel[ch].period<mod.channel[ch].slideto)
      mod.channel[ch].period=mod.channel[ch].slideto;
  }
  mod.channel[ch].flags|=3; // recalc speed
}
Protracker.prototype.effect_t1_4=function(mod, ch) { // 4 vibrato
  var waveform=mod.vibratotable[mod.channel[ch].vibratowave&3][mod.channel[ch].vibratopos]/63.0; //127.0;

  // two different implementations for vibrato
//  var a=(mod.channel[ch].vibratodepth/32)*mod.channel[ch].semitone*waveform; // non-linear vibrato +/- semitone
  var a=mod.channel[ch].vibratodepth*waveform; // linear vibrato, depth has more effect high notes

  mod.channel[ch].voiceperiod+=a;
  mod.channel[ch].flags|=1;
}
Protracker.prototype.effect_t1_5=function(mod, ch) { // 5 volslide + slide to note
  mod.effect_t1_3(mod, ch); // slide to note
  mod.effect_t1_a(mod, ch); // volslide
}
Protracker.prototype.effect_t1_6=function(mod, ch) { // 6 volslide + vibrato
  mod.effect_t1_4(mod, ch); // vibrato
  mod.effect_t1_a(mod, ch); // volslide
}
Protracker.prototype.effect_t1_7=function(mod, ch) { // 7
}
Protracker.prototype.effect_t1_8=function(mod, ch) { // 8 unused
}
Protracker.prototype.effect_t1_9=function(mod, ch) { // 9 set sample offset
}
Protracker.prototype.effect_t1_a=function(mod, ch) { // a volume slide
  if (!(mod.channel[ch].data&0x0f)) {
    // y is zero, slide up
    mod.channel[ch].volume+=(mod.channel[ch].data>>4);
    if (mod.channel[ch].volume>64) mod.channel[ch].volume=64;
  }
  if (!(mod.channel[ch].data&0xf0)) {
    // x is zero, slide down
    mod.channel[ch].volume-=(mod.channel[ch].data&0x0f);
    if (mod.channel[ch].volume<0) mod.channel[ch].volume=0;
  }
}
Protracker.prototype.effect_t1_b=function(mod, ch) { // b pattern jump
}
Protracker.prototype.effect_t1_c=function(mod, ch) { // c set volume
}
Protracker.prototype.effect_t1_d=function(mod, ch) { // d pattern break
}
Protracker.prototype.effect_t1_e=function(mod, ch) { // e
  var i=(mod.channel[ch].data&0xf0)>>4;
  mod.effects_t1_e[i](mod, ch);
}
Protracker.prototype.effect_t1_f=function(mod, ch) { // f
}



//
// tick 1+ effect e functions
//
Protracker.prototype.effect_t1_e0=function(mod, ch) { // e0
}
Protracker.prototype.effect_t1_e1=function(mod, ch) { // e1
}
Protracker.prototype.effect_t1_e2=function(mod, ch) { // e2
}
Protracker.prototype.effect_t1_e3=function(mod, ch) { // e3
}
Protracker.prototype.effect_t1_e4=function(mod, ch) { // e4
}
Protracker.prototype.effect_t1_e5=function(mod, ch) { // e5
}
Protracker.prototype.effect_t1_e6=function(mod, ch) { // e6
}
Protracker.prototype.effect_t1_e7=function(mod, ch) { // e7
}
Protracker.prototype.effect_t1_e8=function(mod, ch) { // e8
}
Protracker.prototype.effect_t1_e9=function(mod, ch) { // e9 retrig sample
  if (mod.tick%(mod.channel[ch].data&0x0f)==0) mod.channel[ch].samplepos=0;
}
Protracker.prototype.effect_t1_ea=function(mod, ch) { // ea
}
Protracker.prototype.effect_t1_eb=function(mod, ch) { // eb
}
Protracker.prototype.effect_t1_ec=function(mod, ch) { // ec cut sample
  mod.effect_t0_ec(mod, ch);
}
Protracker.prototype.effect_t1_ed=function(mod, ch) { // ed delay sample
  mod.effect_t0_ed(mod, ch);
}
Protracker.prototype.effect_t1_ee=function(mod, ch) { // ee
}
Protracker.prototype.effect_t1_ef=function(mod, ch) { // ef
}
