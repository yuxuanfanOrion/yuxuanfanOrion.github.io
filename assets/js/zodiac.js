/* Zodiac sky — animated celestial canvas behind light-mode page content.
   Layers: milky-way band → deep-sky objects → dust stars → non-zodiac constellations →
   named bright stars → zodiac figures → zodiac constellations → planets →
   shooting stars / meteor showers.
   Mouse parallax, twinkling, prefers-reduced-motion safe. */
(function () {
  'use strict';

  var REDUCE = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;
  var FRAME_BUDGET = 1000 / 30;

  /* ===== DATA: zodiac ================================================= */
  var Z = [
    { s:[[.80,.30],[.55,.15],[.30,.22],[.12,.48]], b:[0], l:[[0,1],[1,2],[2,3]] },
    { s:[[.10,.18],[.30,.40],[.50,.55],[.70,.40],[.90,.18]], b:[2], l:[[0,1],[1,2],[2,3],[3,4]] },
    { s:[[.25,.08],[.20,.38],[.22,.72],[.72,.12],[.66,.42],[.63,.76]], b:[0,3], l:[[0,1],[1,2],[3,4],[4,5],[1,4]] },
    { s:[[.20,.18],[.45,.45],[.80,.15],[.50,.82]], b:[1], l:[[0,1],[1,2],[1,3]] },
    { s:[[.10,.55],[.15,.28],[.30,.14],[.50,.20],[.60,.40],[.85,.35],[.82,.66],[.56,.72]], b:[0,5], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,4]] },
    { s:[[.15,.18],[.35,.38],[.50,.55],[.70,.76],[.85,.20],[.65,.38],[.28,.76]], b:[3], l:[[0,1],[1,2],[2,3],[4,5],[5,1],[2,6]] },
    { s:[[.50,.10],[.18,.45],[.82,.45],[.32,.82],[.68,.82]], b:[0], l:[[0,1],[0,2],[1,3],[2,4],[3,4]] },
    { s:[[.08,.14],[.14,.30],[.20,.46],[.32,.56],[.46,.60],[.60,.66],[.73,.76],[.86,.66],[.80,.50]], b:[0], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]] },
    { s:[[.25,.25],[.50,.14],[.75,.25],[.80,.55],[.60,.72],[.35,.72],[.20,.55]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5]] },
    { s:[[.20,.25],[.50,.10],[.80,.28],[.72,.60],[.40,.80],[.15,.58]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
    { s:[[.22,.10],[.50,.22],[.35,.42],[.55,.52],[.40,.72],[.60,.82],[.80,.35]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[1,6]] },
    { s:[[.12,.30],[.22,.14],[.32,.30],[.22,.44],[.45,.52],[.72,.55],[.62,.72],[.82,.72],[.72,.86]], b:[1,7], l:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6],[6,8],[8,7],[7,5]] }
  ];

  /* ===== DATA: zodiac figures ========================================== */
  /* Each function draws at origin; caller translates/scales.
     Coordinate space roughly [-0.5, 0.5].  s = pixel scale. */
  var FIGS = [
    /* 0  Aries — ram with curling horns */
    function (c, s) {
      c.beginPath();
      c.moveTo(-0.05*s, 0.15*s);
      c.quadraticCurveTo(-0.28*s, -0.15*s, -0.08*s, -0.35*s);
      c.quadraticCurveTo(0.08*s, -0.48*s, 0.22*s, -0.3*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.05*s, 0.15*s);
      c.quadraticCurveTo(0.28*s, -0.15*s, 0.08*s, -0.35*s);
      c.quadraticCurveTo(-0.08*s, -0.48*s, -0.22*s, -0.3*s);
      c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 0.32*s); c.stroke();
    },

    /* 1  Taurus — bull head with crescent horns */
    function (c, s) {
      c.beginPath(); c.ellipse(0, 0.08*s, 0.16*s, 0.18*s, 0, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(-0.14*s, -0.06*s);
      c.quadraticCurveTo(-0.28*s, -0.2*s, -0.22*s, -0.38*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.14*s, -0.06*s);
      c.quadraticCurveTo(0.28*s, -0.2*s, 0.22*s, -0.38*s);
      c.stroke();
      c.beginPath(); c.arc(-0.06*s, 0.02*s, 0.02*s, 0, TAU); c.stroke();
      c.beginPath(); c.arc(0.06*s, 0.02*s, 0.02*s, 0, TAU); c.stroke();
    },

    /* 2  Gemini — two figures holding hands */
    function (c, s) {
      function person(ox) {
        c.beginPath(); c.arc(ox, -0.3*s, 0.055*s, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(ox, -0.245*s); c.lineTo(ox, 0.02*s); c.stroke();
        c.beginPath(); c.moveTo(ox, 0.02*s); c.lineTo(ox - 0.08*s, 0.25*s); c.stroke();
        c.beginPath(); c.moveTo(ox, 0.02*s); c.lineTo(ox + 0.08*s, 0.25*s); c.stroke();
        c.beginPath();
        c.moveTo(ox - 0.12*s, -0.1*s); c.lineTo(ox, -0.18*s); c.lineTo(ox + 0.12*s, -0.1*s);
        c.stroke();
      }
      person(-0.18*s); person(0.18*s);
      c.beginPath(); c.moveTo(-0.06*s, -0.1*s); c.lineTo(0.06*s, -0.1*s); c.stroke();
    },

    /* 3  Cancer — crab */
    function (c, s) {
      c.beginPath(); c.ellipse(0, 0.05*s, 0.16*s, 0.12*s, 0, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(-0.15*s, -0.02*s);
      c.quadraticCurveTo(-0.28*s, -0.08*s, -0.26*s, -0.22*s);
      c.moveTo(-0.26*s, -0.22*s);
      c.quadraticCurveTo(-0.22*s, -0.28*s, -0.18*s, -0.24*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.15*s, -0.02*s);
      c.quadraticCurveTo(0.28*s, -0.08*s, 0.26*s, -0.22*s);
      c.moveTo(0.26*s, -0.22*s);
      c.quadraticCurveTo(0.22*s, -0.28*s, 0.18*s, -0.24*s);
      c.stroke();
      var lx = [-0.12, -0.05, 0.05, 0.12];
      for (var i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(lx[i]*s, 0.14*s);
        c.lineTo((lx[i] + (lx[i] < 0 ? -0.06 : 0.06))*s, 0.28*s);
        c.stroke();
      }
    },

    /* 4  Leo — lion with mane */
    function (c, s) {
      c.beginPath(); c.arc(-0.12*s, -0.1*s, 0.14*s, 0, TAU); c.stroke();
      c.beginPath(); c.arc(-0.12*s, -0.1*s, 0.08*s, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(0.02*s, -0.08*s);
      c.lineTo(0.22*s, -0.02*s);
      c.quadraticCurveTo(0.3*s, 0.02*s, 0.26*s, 0.12*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.26*s, 0.12*s);
      c.quadraticCurveTo(0.38*s, 0.08*s, 0.34*s, 0.22*s);
      c.stroke();
      c.beginPath(); c.moveTo(0.05*s, 0.04*s); c.lineTo(0.02*s, 0.25*s); c.stroke();
      c.beginPath(); c.moveTo(0.2*s, 0.06*s); c.lineTo(0.22*s, 0.25*s); c.stroke();
    },

    /* 5  Virgo — winged woman */
    function (c, s) {
      c.beginPath(); c.arc(0, -0.32*s, 0.055*s, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(0, -0.265*s); c.lineTo(0, 0.05*s); c.stroke();
      c.beginPath(); c.moveTo(-0.1*s, 0.05*s); c.lineTo(0, -0.02*s); c.lineTo(0.1*s, 0.05*s); c.stroke();
      c.beginPath();
      c.moveTo(-0.13*s, 0.05*s);
      c.quadraticCurveTo(-0.1*s, 0.2*s, -0.16*s, 0.32*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.13*s, 0.05*s);
      c.quadraticCurveTo(0.1*s, 0.2*s, 0.16*s, 0.32*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.02*s, -0.2*s);
      c.quadraticCurveTo(0.2*s, -0.35*s, 0.22*s, -0.15*s);
      c.quadraticCurveTo(0.28*s, -0.28*s, 0.3*s, -0.12*s);
      c.stroke();
    },

    /* 6  Libra — scales */
    function (c, s) {
      c.beginPath(); c.moveTo(-0.3*s, -0.05*s); c.lineTo(0.3*s, -0.05*s); c.stroke();
      c.beginPath(); c.moveTo(0, -0.05*s); c.lineTo(0, 0.2*s); c.stroke();
      c.beginPath(); c.moveTo(-0.12*s, 0.2*s); c.lineTo(0.12*s, 0.2*s); c.stroke();
      c.beginPath();
      c.moveTo(-0.3*s, -0.05*s); c.lineTo(-0.35*s, 0.08*s); c.lineTo(-0.25*s, 0.08*s); c.closePath();
      c.stroke();
      c.beginPath(); c.arc(-0.3*s, 0.12*s, 0.08*s, 0, Math.PI); c.stroke();
      c.beginPath();
      c.moveTo(0.3*s, -0.05*s); c.lineTo(0.25*s, 0.08*s); c.lineTo(0.35*s, 0.08*s); c.closePath();
      c.stroke();
      c.beginPath(); c.arc(0.3*s, 0.12*s, 0.08*s, 0, Math.PI); c.stroke();
    },

    /* 7  Scorpius — scorpion with curved stinger */
    function (c, s) {
      c.beginPath(); c.ellipse(-0.15*s, 0.05*s, 0.12*s, 0.08*s, 0, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(-0.03*s, 0.05*s);
      c.quadraticCurveTo(0.12*s, 0.12*s, 0.2*s, 0.2*s);
      c.quadraticCurveTo(0.3*s, 0.28*s, 0.32*s, 0.15*s);
      c.quadraticCurveTo(0.34*s, 0.05*s, 0.28*s, -0.02*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.28*s, -0.02*s); c.lineTo(0.32*s, -0.08*s); c.moveTo(0.28*s, -0.02*s); c.lineTo(0.24*s, -0.08*s);
      c.stroke();
      c.beginPath();
      c.moveTo(-0.22*s, -0.02*s);
      c.quadraticCurveTo(-0.32*s, -0.12*s, -0.28*s, -0.22*s);
      c.moveTo(-0.28*s, -0.22*s); c.lineTo(-0.32*s, -0.2*s);
      c.moveTo(-0.28*s, -0.22*s); c.lineTo(-0.26*s, -0.18*s);
      c.stroke();
      c.beginPath();
      c.moveTo(-0.18*s, -0.02*s);
      c.quadraticCurveTo(-0.22*s, -0.15*s, -0.16*s, -0.22*s);
      c.moveTo(-0.16*s, -0.22*s); c.lineTo(-0.2*s, -0.2*s);
      c.moveTo(-0.16*s, -0.22*s); c.lineTo(-0.14*s, -0.18*s);
      c.stroke();
    },

    /* 8  Sagittarius — centaur archer */
    function (c, s) {
      c.beginPath(); c.arc(-0.08*s, -0.3*s, 0.05*s, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(-0.08*s, -0.25*s); c.lineTo(-0.05*s, -0.08*s); c.stroke();
      c.beginPath();
      c.moveTo(-0.05*s, -0.08*s);
      c.lineTo(0.12*s, 0); c.lineTo(0.22*s, 0.08*s);
      c.stroke();
      c.beginPath(); c.moveTo(0.12*s, 0.08*s); c.lineTo(0.08*s, 0.25*s); c.stroke();
      c.beginPath(); c.moveTo(0.22*s, 0.08*s); c.lineTo(0.25*s, 0.25*s); c.stroke();
      c.beginPath();
      c.moveTo(-0.22*s, -0.08*s); c.lineTo(-0.05*s, -0.18*s); c.lineTo(0.15*s, -0.3*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.15*s, -0.3*s); c.lineTo(0.12*s, -0.35*s);
      c.moveTo(0.15*s, -0.3*s); c.lineTo(0.2*s, -0.32*s);
      c.stroke();
      c.beginPath();
      c.arc(-0.18*s, -0.12*s, 0.12*s, -0.6, 0.6);
      c.stroke();
    },

    /* 9  Capricornus — sea-goat (goat head + fish tail) */
    function (c, s) {
      c.beginPath(); c.arc(-0.18*s, -0.15*s, 0.08*s, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(-0.22*s, -0.22*s);
      c.quadraticCurveTo(-0.28*s, -0.38*s, -0.2*s, -0.35*s);
      c.stroke();
      c.beginPath();
      c.moveTo(-0.14*s, -0.22*s);
      c.quadraticCurveTo(-0.08*s, -0.38*s, -0.16*s, -0.35*s);
      c.stroke();
      c.beginPath();
      c.moveTo(-0.1*s, -0.12*s);
      c.lineTo(0.05*s, -0.05*s);
      c.quadraticCurveTo(0.18*s, 0.02*s, 0.22*s, 0.12*s);
      c.quadraticCurveTo(0.25*s, 0.22*s, 0.18*s, 0.28*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.18*s, 0.28*s);
      c.quadraticCurveTo(0.1*s, 0.32*s, 0.15*s, 0.22*s);
      c.moveTo(0.18*s, 0.28*s);
      c.quadraticCurveTo(0.26*s, 0.32*s, 0.22*s, 0.22*s);
      c.stroke();
    },

    /* 10 Aquarius — water bearer pouring */
    function (c, s) {
      c.beginPath(); c.arc(-0.05*s, -0.32*s, 0.05*s, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(-0.05*s, -0.27*s); c.lineTo(-0.05*s, -0.08*s); c.stroke();
      c.beginPath();
      c.moveTo(-0.18*s, -0.15*s); c.lineTo(-0.05*s, -0.2*s); c.lineTo(0.12*s, -0.25*s);
      c.stroke();
      c.beginPath(); c.moveTo(-0.05*s, -0.08*s); c.lineTo(-0.12*s, 0.12*s); c.stroke();
      c.beginPath(); c.moveTo(-0.05*s, -0.08*s); c.lineTo(0.04*s, 0.12*s); c.stroke();
      c.beginPath();
      c.moveTo(0.12*s, -0.2*s);
      c.quadraticCurveTo(0.2*s, -0.12*s, 0.14*s, -0.05*s);
      c.quadraticCurveTo(0.08*s, 0.02*s, 0.16*s, 0.08*s);
      c.quadraticCurveTo(0.24*s, 0.14*s, 0.16*s, 0.2*s);
      c.stroke();
      c.beginPath();
      c.moveTo(0.1*s, -0.18*s);
      c.quadraticCurveTo(0.18*s, -0.1*s, 0.12*s, -0.03*s);
      c.quadraticCurveTo(0.06*s, 0.04*s, 0.14*s, 0.1*s);
      c.quadraticCurveTo(0.22*s, 0.16*s, 0.14*s, 0.22*s);
      c.stroke();
    },

    /* 11 Pisces — two fish connected by a cord */
    function (c, s) {
      c.beginPath(); c.ellipse(-0.2*s, -0.12*s, 0.1*s, 0.06*s, -0.3, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(-0.3*s, -0.14*s);
      c.lineTo(-0.36*s, -0.2*s); c.lineTo(-0.36*s, -0.08*s); c.closePath();
      c.stroke();
      c.beginPath(); c.ellipse(0.2*s, 0.12*s, 0.1*s, 0.06*s, -0.3, 0, TAU); c.stroke();
      c.beginPath();
      c.moveTo(0.3*s, 0.1*s);
      c.lineTo(0.36*s, 0.04*s); c.lineTo(0.36*s, 0.16*s); c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(-0.1*s, -0.1*s);
      c.quadraticCurveTo(0.05*s, -0.15*s, 0.05*s, 0);
      c.quadraticCurveTo(0.05*s, 0.1*s, 0.1*s, 0.1*s);
      c.stroke();
    }
  ];

  var ACCENT = '90,115,200';
  var GOLD   = '184,134,11';
  var GEMINI_IDX = 2;

  var DUST_COLORS = ['90,115,200','130,160,220','160,140,200','110,130,190'];

  /* ===== DATA: named bright stars ====================================== */
  var STARS = [
    { name:'Polaris',    x:0.50, y:0.02, color:'255,245,220', r:3.0, noTwinkle:true },
    { name:'Vega',       x:0.62, y:0.06, color:'180,210,255', r:3.5 },
    { name:'Deneb',      x:0.72, y:0.08, color:'220,230,255', r:3.0 },
    { name:'Capella',    x:0.25, y:0.08, color:'255,235,180', r:3.2 },
    { name:'Arcturus',   x:0.45, y:0.15, color:'255,200,130', r:3.5 },
    { name:'Castor',     x:0.55, y:0.12, color:'220,230,255', r:2.5 },
    { name:'Pollux',     x:0.58, y:0.14, color:'255,200,130', r:2.8 },
    { name:'Betelgeuse', x:0.12, y:0.28, color:'255,150,80',  r:4.0, variable:true },
    { name:'Rigel',      x:0.18, y:0.35, color:'180,210,255', r:3.8 },
    { name:'Sirius',     x:0.22, y:0.42, color:'200,220,255', r:5.0 },
    { name:'Procyon',    x:0.35, y:0.30, color:'255,245,220', r:3.0 },
    { name:'Aldebaran',  x:0.20, y:0.18, color:'255,180,110', r:3.2 },
    { name:'Regulus',    x:0.38, y:0.22, color:'180,210,255', r:2.8 },
    { name:'Spica',      x:0.52, y:0.38, color:'180,210,255', r:3.0 },
    { name:'Antares',    x:0.68, y:0.50, color:'255,150,80',  r:3.5 },
    { name:'Altair',     x:0.78, y:0.25, color:'220,230,255', r:3.2 },
    { name:'Fomalhaut',  x:0.85, y:0.55, color:'220,230,255', r:2.5 },
    { name:'Achernar',   x:0.90, y:0.70, color:'180,210,255', r:2.8 },
    { name:'Canopus',    x:0.30, y:0.65, color:'255,245,220', r:3.5 },
    { name:'Acrux',      x:0.60, y:0.85, color:'180,210,255', r:2.5 }
  ];

  /* ===== DATA: non-zodiac constellations =============================== */
  var EXTRA = [
    { name:'Orion',        cx:0.15, cy:0.32, scale:0.7,
      s:[[.35,.15],[.65,.15],[.5,.38],[.5,.48],[.5,.58],[.25,.85],[.75,.85],[.5,.68]],
      b:[0,1,5,6], l:[[0,2],[1,2],[2,3],[3,4],[4,5],[4,6],[0,7],[1,7]] },
    { name:'Big Dipper',   cx:0.35, cy:0.05, scale:0.6,
      s:[[.0,.5],[.2,.3],[.45,.25],[.6,.35],[.75,.3],[.85,.15],[.95,.2]],
      b:[0,6], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
    { name:'Cassiopeia',   cx:0.65, cy:0.04, scale:0.5,
      s:[[.0,.6],[.25,.2],[.5,.5],[.75,.15],[1,.55]],
      b:[2], l:[[0,1],[1,2],[2,3],[3,4]] },
    { name:'Cygnus',       cx:0.70, cy:0.10, scale:0.55,
      s:[[.5,.0],[.5,.35],[.5,.7],[.2,.35],[.8,.35],[.5,1]],
      b:[0,5], l:[[0,1],[1,2],[2,5],[1,3],[1,4]] },
    { name:'Canis Major',  cx:0.20, cy:0.45, scale:0.5,
      s:[[.4,.1],[.5,.35],[.6,.55],[.3,.7],[.7,.65],[.5,.85]],
      b:[0], l:[[0,1],[1,2],[2,3],[2,4],[3,5],[4,5]] },
    { name:'Lyra',         cx:0.60, cy:0.08, scale:0.35,
      s:[[.5,.0],[.3,.5],[.7,.5],[.25,.8],[.75,.8]],
      b:[0], l:[[0,1],[0,2],[1,3],[2,4],[3,4],[1,2]] },
    { name:'Crux',         cx:0.55, cy:0.88, scale:0.35,
      s:[[.5,.0],[.5,1],[.0,.45],[1,.45],[.65,.55]],
      b:[0,1], l:[[0,1],[2,3]] },
    { name:'Aquila',       cx:0.80, cy:0.22, scale:0.45,
      s:[[.5,.15],[.3,.45],[.7,.45],[.5,.75],[.2,.7],[.8,.7]],
      b:[0], l:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]] }
  ];

  /* ===== DATA: deep-sky objects ======================================== */
  var DSO = [
    { name:'Pleiades',     x:0.22, y:0.15, type:'cluster', count:9,  rx:22,       color:'140,175,230' },
    { name:'Orion Nebula', x:0.15, y:0.34, type:'nebula',  rx:28, ry:22, color:'200,140,180' },
    { name:'Andromeda',    x:0.78, y:0.12, type:'galaxy',  rx:40, ry:12, color:'170,165,210', angle:-0.5 },
    { name:'Lagoon Neb.',  x:0.72, y:0.55, type:'nebula',  rx:20, ry:16, color:'200,150,170' },
    { name:'Omega Cen.',   x:0.40, y:0.78, type:'cluster', count:15, rx:18, color:'255,235,190' }
  ];

  /* ===== DATA: planets ================================================= */
  var PLANETS = [
    { name:'Venus',   x:0.08, y:0.20, r:4.5, color:'255,250,220' },
    { name:'Mars',    x:0.42, y:0.45, r:3.2, color:'255,160,120' },
    { name:'Jupiter', x:0.75, y:0.35, r:4.8, color:'255,240,200' },
    { name:'Saturn',  x:0.88, y:0.42, r:3.5, color:'255,225,160' }
  ];

  /* ===== HELPERS ======================================================= */

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  var _seed = 137;
  function srand() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }

  /* ===== RENDERING ENGINE ============================================== */
  function Sky(canvas, content) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.content = content;
    this.w = 0; this.h = 0;
    this.visible = true;
    this.lastFrame = 0;
    this.mouseX = 0.5; this.mouseY = 0.5;
    this.curX = 0.5; this.curY = 0.5;
    this.shooting = null;
    this.nextShootAt = 0;
    this.layout = [];
    this.dust = [];
    this.mwImg = null;

    /* extra-constellation layout (computed in computeLayout) */
    this.extraLayout = [];
    /* bright star twinkle data */
    this.starTwinkle = [];
    /* meteor shower state */
    this.showerActive = false;
    this.showerStars = [];
    this.nextShowerAt = 0;

    var self = this;
    this.computeLayout();

    if (!REDUCE) {
      window.addEventListener('mousemove', function (e) {
        self.mouseX = e.clientX / window.innerWidth;
        self.mouseY = e.clientY / window.innerHeight;
      }, { passive: true });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        self.visible = ents[0].isIntersecting;
      }).observe(canvas);
    }
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT); rT = setTimeout(function () { self.computeLayout(); }, 200);
    });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        clearTimeout(rT); rT = setTimeout(function () { self.computeLayout(); }, 150);
      }).observe(content);
    }
    new MutationObserver(function () {
      setTimeout(function () { self.computeLayout(); }, 60);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (REDUCE) { this.drawFrame(0); }
    else {
      requestAnimationFrame(function tick(ts) {
        requestAnimationFrame(tick);
        if (document.hidden || !self.visible) return;
        if (isDark()) { canvas.style.display = 'none'; return; }
        canvas.style.display = '';
        if (ts - self.lastFrame < FRAME_BUDGET) return;
        self.lastFrame = ts;
        self.drawFrame(ts);
      });
    }
  }

  Sky.prototype.computeLayout = function () {
    if (isDark()) { this.canvas.style.display = 'none'; return; }
    this.canvas.style.display = '';

    var w = this.content.offsetWidth;
    var h = this.content.scrollHeight || this.content.offsetHeight;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* dust stars */
    _seed = 42;
    var dc = Math.max(80, Math.round(w * h / 8000));
    dc = Math.min(dc, 220);
    this.dust = [];
    for (var d = 0; d < dc; d++) {
      var dy = srand();
      this.dust.push({
        x: srand() * w, y: dy * h,
        r: 0.6 + srand() * 1.5,
        baseAlpha: (0.10 + srand() * 0.20) * Math.max(0.2, 1 - dy * 0.6),
        spd: 0.0005 + srand() * 0.002, ph: srand() * TAU,
        color: DUST_COLORS[Math.floor(srand() * DUST_COLORS.length)],
        depth: 0.1 + srand() * 0.5
      });
    }

    this.renderMilkyWay(w, h);

    /* zodiac constellations */
    var cols = 4, rows = 3, cellW = w / cols;
    var cellH = Math.max(h / rows, 280);
    var baseSize = Math.max(90, Math.min(cellW, cellH) * 0.55);
    baseSize = Math.min(baseSize, 200);

    _seed = 137;
    this.layout = [];
    for (var i = 0; i < Z.length; i++) {
      var isG = (i === GEMINI_IDX);
      var col = i % cols, row = Math.floor(i / cols);
      var cx = cellW * (col + 0.5) + (srand() - 0.5) * cellW * 0.32;
      var cy = cellH * (row + 0.5) + (srand() - 0.5) * cellH * 0.22 + 40;
      var rot = (srand() - 0.5) * 0.35;
      var sd = [];
      for (var si = 0; si < Z[i].s.length; si++)
        sd.push({ spd: 0.0006 + srand() * 0.0018, ph: srand() * TAU });
      this.layout.push({
        cx: cx, cy: cy, rot: rot,
        size: isG ? baseSize * 1.45 : baseSize,
        figSize: (isG ? baseSize * 1.6 : baseSize * 1.1),
        isG: isG, rgb: isG ? GOLD : ACCENT,
        boost: isG ? 2.5 : 1,
        depth: 0.3 + i * 0.06, sd: sd
      });
    }

    /* non-zodiac constellation layout */
    _seed = 999;
    this.extraLayout = [];
    for (var ei = 0; ei < EXTRA.length; ei++) {
      var ex = EXTRA[ei];
      var eSize = baseSize * ex.scale;
      var eRot = (srand() - 0.5) * 0.25;
      var esd = [];
      for (var esi = 0; esi < ex.s.length; esi++)
        esd.push({ spd: 0.0006 + srand() * 0.0018, ph: srand() * TAU });
      this.extraLayout.push({
        cx: ex.cx * w, cy: ex.cy * h,
        rot: eRot, size: eSize,
        depth: 0.2 + ei * 0.04, sd: esd
      });
    }

    /* bright star twinkle data */
    _seed = 777;
    this.starTwinkle = [];
    for (var bi = 0; bi < STARS.length; bi++) {
      this.starTwinkle.push({
        spd: 0.0008 + srand() * 0.002, ph: srand() * TAU,
        depth: 0.15 + srand() * 0.3
      });
    }

    if (REDUCE) this.drawFrame(0);
  };

  Sky.prototype.renderMilkyWay = function (w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 6);
    var band = Math.max(h * 0.3, 160);
    var L = Math.sqrt(w * w + h * h);

    /* main band gradient — enhanced opacity */
    var grad = g.createLinearGradient(0, -band / 2, 0, band / 2);
    grad.addColorStop(0, 'rgba(130,155,210,0)');
    grad.addColorStop(0.3, 'rgba(130,155,210,0.04)');
    grad.addColorStop(0.5, 'rgba(150,165,220,0.07)');
    grad.addColorStop(0.7, 'rgba(130,155,210,0.04)');
    grad.addColorStop(1, 'rgba(130,155,210,0)');
    g.fillStyle = grad;
    g.fillRect(-L, -band / 2, L * 2, band);

    /* galactic center — warmer, brighter region near ~60% of band */
    var gcX = L * 0.15;
    var gcR = band * 0.6;
    var gcGrad = g.createRadialGradient(gcX, 0, 0, gcX, 0, gcR);
    gcGrad.addColorStop(0, 'rgba(180,165,140,0.06)');
    gcGrad.addColorStop(0.5, 'rgba(160,155,150,0.03)');
    gcGrad.addColorStop(1, 'rgba(140,145,160,0)');
    g.fillStyle = gcGrad;
    g.fillRect(gcX - gcR, -gcR, gcR * 2, gcR * 2);

    /* dark lanes — narrow strips of transparency */
    g.globalCompositeOperation = 'destination-out';
    var lanes = [
      { y: -band * 0.08, w: band * 0.03 },
      { y:  band * 0.12, w: band * 0.025 },
      { y: -band * 0.22, w: band * 0.02 }
    ];
    for (var dl = 0; dl < lanes.length; dl++) {
      var dlGrad = g.createLinearGradient(0, lanes[dl].y - lanes[dl].w, 0, lanes[dl].y + lanes[dl].w);
      dlGrad.addColorStop(0, 'rgba(0,0,0,0)');
      dlGrad.addColorStop(0.4, 'rgba(0,0,0,0.03)');
      dlGrad.addColorStop(0.6, 'rgba(0,0,0,0.03)');
      dlGrad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = dlGrad;
      g.fillRect(-L, lanes[dl].y - lanes[dl].w, L * 2, lanes[dl].w * 2);
    }
    g.globalCompositeOperation = 'source-over';

    /* micro-stars — increased count */
    for (var i = 0; i < 500; i++) {
      var mx = (Math.random() * 2 - 1) * L;
      var my = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5 * band * 0.45;
      g.fillStyle = 'rgba(120,145,200,' + (0.04 + Math.random() * 0.08).toFixed(3) + ')';
      g.fillRect(mx, my, Math.random() < 0.3 ? 1.3 : 0.8, 0.8);
    }
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    var vm = g.createLinearGradient(0, 0, 0, h);
    vm.addColorStop(0, 'rgba(0,0,0,1)'); vm.addColorStop(0.55, 'rgba(0,0,0,0.7)');
    vm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = vm; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    this.mwImg = c;
  };

  Sky.prototype.drawFrame = function (ts) {
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    this.curX += (this.mouseX - this.curX) * 0.03;
    this.curY += (this.mouseY - this.curY) * 0.03;
    var px = (this.curX - 0.5) * 18;
    var py = (this.curY - 0.5) * 12;

    /* 1. milky way */
    if (this.mwImg) ctx.drawImage(this.mwImg, -px * 0.15, -py * 0.15, w, h);

    /* 2. deep-sky objects */
    this.drawDSO(ctx, w, h, px, py, ts);

    /* 3. dust stars */
    for (var d = 0; d < this.dust.length; d++) {
      var ds = this.dust[d];
      var tw = REDUCE ? 1 : 0.45 + 0.55 * Math.sin(ts * ds.spd + ds.ph);
      ctx.globalAlpha = ds.baseAlpha * tw;
      ctx.beginPath();
      ctx.arc(ds.x - px * ds.depth, ds.y - py * ds.depth, ds.r, 0, TAU);
      ctx.fillStyle = 'rgb(' + ds.color + ')';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 4. non-zodiac constellations */
    this.drawExtraConstellations(ctx, w, h, px, py, ts);

    /* 5. named bright stars */
    this.drawBrightStars(ctx, w, h, px, py, ts);

    /* 6-7. zodiac figures + constellation lines + stars */
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i], L = this.layout[i];
      if (!L) continue;
      var vFade = Math.max(0.30, 1 - (L.cy / h) * 0.55);
      var ox = L.cx - px * L.depth, oy = L.cy - py * L.depth;

      /* figure illustration (behind stars) */
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(L.rot);
      var figAlpha = (L.isG ? 0.18 : 0.10) * vFade;
      var figPulse = REDUCE ? 1 : 0.8 + 0.2 * Math.sin(ts * 0.0003 + i * 2);
      ctx.strokeStyle = 'rgba(' + L.rgb + ',' + (figAlpha * figPulse).toFixed(4) + ')';
      ctx.lineWidth = L.isG ? 1.5 : 1.0;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (FIGS[i]) FIGS[i](ctx, L.figSize);
      ctx.restore();

      /* constellation lines */
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(L.rot);
      var lp = REDUCE ? 1 : 0.85 + 0.15 * Math.sin(ts * 0.0005 + i);
      ctx.strokeStyle = 'rgba(' + L.rgb + ',' + (0.25 * L.boost * vFade * lp).toFixed(4) + ')';
      ctx.lineWidth = L.isG ? 2.0 : 1.3;
      ctx.lineCap = 'round';
      for (var li = 0; li < z.l.length; li++) {
        var a = z.s[z.l[li][0]], b = z.s[z.l[li][1]];
        ctx.beginPath();
        ctx.moveTo((a[0] - 0.5) * L.size, (a[1] - 0.5) * L.size);
        ctx.lineTo((b[0] - 0.5) * L.size, (b[1] - 0.5) * L.size);
        ctx.stroke();
      }

      /* constellation stars */
      for (var si = 0; si < z.s.length; si++) {
        var st = z.s[si], sd = L.sd[si];
        var x = (st[0] - 0.5) * L.size, y = (st[1] - 0.5) * L.size;
        var bright = z.b && z.b.indexOf(si) !== -1;
        var r = bright ? (L.isG ? 5.0 : 3.5) : (L.isG ? 2.8 : 2.0);
        var stw = REDUCE ? 1 : 0.65 + 0.35 * Math.sin(ts * sd.spd + sd.ph);
        var sal = (bright ? 0.45 : 0.30) * L.boost * vFade * stw;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = 'rgba(' + L.rgb + ',' + sal.toFixed(4) + ')';
        ctx.fill();
        if (bright) {
          var glowR = L.isG ? r * 6 : r * 4;
          var g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
          g.addColorStop(0, 'rgba(' + L.rgb + ',' + (0.20 * L.boost * vFade * stw).toFixed(4) + ')');
          g.addColorStop(1, 'rgba(' + L.rgb + ',0)');
          ctx.beginPath(); ctx.arc(x, y, glowR, 0, TAU);
          ctx.fillStyle = g; ctx.fill();
        }
      }
      ctx.restore();
    }

    /* 8. planets */
    this.drawPlanets(ctx, w, h, px, py, ts);

    /* 9. shooting stars / meteor showers */
    if (!REDUCE) this.drawShooting(ts);
  };

  /* ---- Deep-sky objects renderer ---- */
  Sky.prototype.drawDSO = function (ctx, w, h, px, py, ts) {
    for (var i = 0; i < DSO.length; i++) {
      var d = DSO[i];
      var dx = d.x * w - px * 0.12;
      var dy = d.y * h - py * 0.12;
      var vFade = Math.max(0.25, 1 - d.y * 0.55);

      if (d.type === 'cluster') {
        /* faint haze behind */
        var hGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, d.rx * 1.5);
        hGrad.addColorStop(0, 'rgba(' + d.color + ',' + (0.08 * vFade).toFixed(4) + ')');
        hGrad.addColorStop(1, 'rgba(' + d.color + ',0)');
        ctx.beginPath(); ctx.arc(dx, dy, d.rx * 2.5, 0, TAU);
        ctx.fillStyle = hGrad; ctx.fill();
        /* tiny dots */
        _seed = 5000 + i * 100;
        for (var ci = 0; ci < (d.count || 7); ci++) {
          var cx = dx + (srand() - 0.5) * d.rx * 2;
          var cy = dy + (srand() - 0.5) * d.rx * 2;
          var cr = 0.6 + srand() * 0.8;
          var ca = (0.18 + srand() * 0.18) * vFade;
          var ctw = REDUCE ? 1 : 0.6 + 0.4 * Math.sin(ts * (0.001 + srand() * 0.002) + srand() * TAU);
          ctx.globalAlpha = ca * ctw;
          ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU);
          ctx.fillStyle = 'rgb(' + d.color + ')';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (d.type === 'nebula') {
        var nRx = d.rx || 15;
        var nRy = d.ry || nRx;
        var nGrad = ctx.createRadialGradient(dx, dy, 0, dx, dy, Math.max(nRx, nRy));
        nGrad.addColorStop(0, 'rgba(' + d.color + ',' + (0.12 * vFade).toFixed(4) + ')');
        nGrad.addColorStop(0.5, 'rgba(' + d.color + ',' + (0.05 * vFade).toFixed(4) + ')');
        nGrad.addColorStop(1, 'rgba(' + d.color + ',0)');
        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(1, nRy / nRx);
        ctx.beginPath(); ctx.arc(0, 0, nRx, 0, TAU);
        ctx.fillStyle = nGrad; ctx.fill();
        ctx.restore();
      } else if (d.type === 'galaxy') {
        var gRx = d.rx || 20;
        var gRy = d.ry || 8;
        var gAngle = d.angle || 0;
        var gGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, gRx);
        gGrad.addColorStop(0, 'rgba(' + d.color + ',' + (0.10 * vFade).toFixed(4) + ')');
        gGrad.addColorStop(0.4, 'rgba(' + d.color + ',' + (0.05 * vFade).toFixed(4) + ')');
        gGrad.addColorStop(1, 'rgba(' + d.color + ',0)');
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(gAngle);
        ctx.scale(1, gRy / gRx);
        ctx.beginPath(); ctx.arc(0, 0, gRx, 0, TAU);
        ctx.fillStyle = gGrad; ctx.fill();
        ctx.restore();
      }
    }
  };

  /* ---- Non-zodiac constellations renderer ---- */
  Sky.prototype.drawExtraConstellations = function (ctx, w, h, px, py, ts) {
    for (var i = 0; i < EXTRA.length; i++) {
      var ex = EXTRA[i], eL = this.extraLayout[i];
      if (!eL) continue;
      var vFade = Math.max(0.25, 1 - (eL.cy / h) * 0.55);
      var ox = eL.cx - px * eL.depth;
      var oy = eL.cy - py * eL.depth;
      var baseOpacity = 1.0;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(eL.rot);

      /* lines */
      var lp = REDUCE ? 1 : 0.85 + 0.15 * Math.sin(ts * 0.0005 + i + 20);
      ctx.strokeStyle = 'rgba(' + ACCENT + ',' + (0.30 * vFade * lp * baseOpacity).toFixed(4) + ')';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (var li = 0; li < ex.l.length; li++) {
        var a = ex.s[ex.l[li][0]], b = ex.s[ex.l[li][1]];
        ctx.beginPath();
        ctx.moveTo((a[0] - 0.5) * eL.size, (a[1] - 0.5) * eL.size);
        ctx.lineTo((b[0] - 0.5) * eL.size, (b[1] - 0.5) * eL.size);
        ctx.stroke();
      }

      /* stars */
      for (var si = 0; si < ex.s.length; si++) {
        var st = ex.s[si], sd = eL.sd[si];
        var sx = (st[0] - 0.5) * eL.size, sy = (st[1] - 0.5) * eL.size;
        var bright = ex.b && ex.b.indexOf(si) !== -1;
        var r = bright ? 3.2 : 1.8;
        var stw = REDUCE ? 1 : 0.6 + 0.4 * Math.sin(ts * sd.spd + sd.ph);
        var sal = (bright ? 0.45 : 0.28) * vFade * stw * baseOpacity;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
        ctx.fillStyle = 'rgba(' + ACCENT + ',' + sal.toFixed(4) + ')';
        ctx.fill();
        if (bright) {
          var glR = r * 3.5;
          var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glR);
          grd.addColorStop(0, 'rgba(' + ACCENT + ',' + (0.12 * vFade * stw * baseOpacity).toFixed(4) + ')');
          grd.addColorStop(1, 'rgba(' + ACCENT + ',0)');
          ctx.beginPath(); ctx.arc(sx, sy, glR, 0, TAU);
          ctx.fillStyle = grd; ctx.fill();
        }
      }
      ctx.restore();
    }
  };

  /* ---- Named bright stars renderer ---- */
  Sky.prototype.drawBrightStars = function (ctx, w, h, px, py, ts) {
    for (var i = 0; i < STARS.length; i++) {
      var star = STARS[i];
      var td = this.starTwinkle[i];
      if (!td) continue;
      var sx = star.x * w - px * td.depth;
      var sy = star.y * h - py * td.depth;
      var vFade = Math.max(0.25, 1 - star.y * 0.55);
      var r = star.r;

      /* variable star pulsation (Betelgeuse) */
      if (star.variable) {
        var pulse = 0.7 + 0.3 * Math.sin(ts * 0.000785); /* ~8s cycle */
        r *= (0.85 + 0.15 * pulse);
        vFade *= (0.8 + 0.2 * pulse);
      }

      /* twinkle */
      var tw;
      if (star.noTwinkle) {
        tw = 1;
      } else {
        tw = REDUCE ? 1 : 0.55 + 0.45 * Math.sin(ts * td.spd + td.ph);
      }

      var alpha = 0.55 * vFade * tw;

      /* glow halo */
      var glowR = r * 5;
      var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      grd.addColorStop(0, 'rgba(' + star.color + ',' + (0.30 * vFade * tw).toFixed(4) + ')');
      grd.addColorStop(0.4, 'rgba(' + star.color + ',' + (0.10 * vFade * tw).toFixed(4) + ')');
      grd.addColorStop(1, 'rgba(' + star.color + ',0)');
      ctx.beginPath(); ctx.arc(sx, sy, glowR, 0, TAU);
      ctx.fillStyle = grd; ctx.fill();

      /* star dot */
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
      ctx.fillStyle = 'rgba(' + star.color + ',' + alpha.toFixed(4) + ')';
      ctx.fill();
    }
  };

  /* ---- Planets renderer ---- */
  Sky.prototype.drawPlanets = function (ctx, w, h, px, py, ts) {
    for (var i = 0; i < PLANETS.length; i++) {
      var pl = PLANETS[i];
      var plx = pl.x * w - px * 0.2;
      var ply = pl.y * h - py * 0.2;
      var vFade = Math.max(0.25, 1 - pl.y * 0.55);
      var alpha = 0.55 * vFade; /* steady — no twinkle */

      /* glow halo */
      var glowR = pl.r * 5;
      var grd = ctx.createRadialGradient(plx, ply, 0, plx, ply, glowR);
      grd.addColorStop(0, 'rgba(' + pl.color + ',' + (0.25 * vFade).toFixed(4) + ')');
      grd.addColorStop(0.4, 'rgba(' + pl.color + ',' + (0.08 * vFade).toFixed(4) + ')');
      grd.addColorStop(1, 'rgba(' + pl.color + ',0)');
      ctx.beginPath(); ctx.arc(plx, ply, glowR, 0, TAU);
      ctx.fillStyle = grd; ctx.fill();

      /* planet dot */
      ctx.beginPath(); ctx.arc(plx, ply, pl.r, 0, TAU);
      ctx.fillStyle = 'rgba(' + pl.color + ',' + alpha.toFixed(4) + ')';
      ctx.fill();

      /* Saturn's ring */
      if (pl.name === 'Saturn') {
        ctx.strokeStyle = 'rgba(' + pl.color + ',' + (0.35 * vFade).toFixed(4) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(plx, ply, pl.r * 2.2, pl.r * 0.7, -0.3, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(plx, ply, pl.r * 2.2, pl.r * 0.7, -0.3, Math.PI + 0.1, TAU - 0.1);
        ctx.stroke();
      }
    }
  };

  /* ---- Shooting stars + meteor shower ---- */
  Sky.prototype.drawShooting = function (ts) {
    var ctx = this.ctx, w = this.w, h = this.h;

    /* meteor shower logic */
    if (!this.nextShowerAt) this.nextShowerAt = ts + 45000 + Math.random() * 45000;
    if (!this.showerActive && ts >= this.nextShowerAt) {
      this.showerActive = true;
      this.showerStars = [];
      var radX = w * (0.1 + Math.random() * 0.8);
      var radY = h * (0.05 + Math.random() * 0.3);
      var burstCount = 3 + Math.floor(Math.random() * 3); /* 3-5 meteors */
      for (var bi = 0; bi < burstCount; bi++) {
        var delay = bi * (200 + Math.random() * 200); /* 200-400ms apart */
        var ang = (10 + Math.random() * 40) * Math.PI / 180;
        var spread = (Math.random() - 0.5) * 0.3;
        this.showerStars.push({
          x: radX + (Math.random() - 0.5) * 40,
          y: radY + (Math.random() - 0.5) * 20,
          vx: Math.cos(ang + spread) * 0.45,
          vy: Math.sin(ang + spread) * 0.45,
          born: ts + delay, life: 900 + Math.random() * 400,
          active: false
        });
      }
    }

    /* draw shower meteors */
    if (this.showerActive) {
      var allDone = true;
      for (var si = 0; si < this.showerStars.length; si++) {
        var sm = this.showerStars[si];
        if (ts < sm.born) { allDone = false; continue; }
        sm.active = true;
        var sage = ts - sm.born;
        if (sage > sm.life) continue;
        allDone = false;
        var st = sage / sm.life;
        var sfade = st < 0.12 ? st / 0.12 : 1 - (st - 0.12) / 0.88;
        var shx = sm.x + sm.vx * sage, shy = sm.y + sm.vy * sage;
        var TRAIL = 80;
        var stx = shx - sm.vx / 0.45 * TRAIL, sty = shy - sm.vy / 0.45 * TRAIL;
        var sgrad = ctx.createLinearGradient(stx, sty, shx, shy);
        sgrad.addColorStop(0, 'rgba(' + ACCENT + ',0)');
        sgrad.addColorStop(1, 'rgba(' + ACCENT + ',' + (0.20 * sfade).toFixed(4) + ')');
        ctx.strokeStyle = sgrad; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(stx, sty); ctx.lineTo(shx, shy); ctx.stroke();
        ctx.beginPath(); ctx.arc(shx, shy, 1.3, 0, TAU);
        ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.28 * sfade).toFixed(4) + ')';
        ctx.fill();
      }
      /* check if all shower meteors are done */
      if (allDone || (this.showerStars.length > 0 && ts - this.showerStars[0].born > 4000)) {
        this.showerActive = false;
        this.showerStars = [];
        this.nextShowerAt = ts + 45000 + Math.random() * 45000;
      }
    }

    /* single-meteor mode (existing behavior) */
    if (!this.shooting) {
      if (!this.nextShootAt) this.nextShootAt = ts + 3000 + Math.random() * 6000;
      if (ts < this.nextShootAt) return;
      var ang = (12 + Math.random() * 35) * Math.PI / 180;
      this.shooting = {
        x: w * (0.05 + Math.random() * 0.85),
        y: h * (0.02 + Math.random() * 0.55),
        vx: Math.cos(ang) * 0.42, vy: Math.sin(ang) * 0.42,
        born: ts, life: 1100
      };
    }
    var m = this.shooting, age = ts - m.born;
    if (age > m.life) {
      this.shooting = null;
      this.nextShootAt = ts + 6000 + Math.random() * 12000;
      return;
    }
    var t = age / m.life;
    var fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
    var hx = m.x + m.vx * age, hy = m.y + m.vy * age;
    var TRAIL = 100;
    var tx = hx - m.vx / 0.42 * TRAIL, ty = hy - m.vy / 0.42 * TRAIL;
    var grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'rgba(' + ACCENT + ',0)');
    grad.addColorStop(1, 'rgba(' + ACCENT + ',' + (0.22 * fade).toFixed(4) + ')');
    ctx.strokeStyle = grad; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 1.5, 0, TAU);
    ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.30 * fade).toFixed(4) + ')';
    ctx.fill();
  };

  function init() {
    var content = document.querySelector('.page-content');
    if (!content) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'zodiac-bg';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    content.appendChild(canvas);
    new Sky(canvas, content);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
