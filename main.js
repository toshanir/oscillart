var blob, recorder = null; 
var chunks = []; 
const recording_toggle = document.getElementById('record'); 

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function fixCanvasResolution() {
  const ratio = window.devicePixelRatio || 1;
  const w = 900, h = 500; // tutorial canvas size
  canvas.width  = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width  = w + "px";
  canvas.style.height = h + "px";
  ctx.scale(ratio, ratio);
}
fixCanvasResolution();

let width = 900;
let height = 500;

// drawing variables
let x = 0;
let y = height / 2;
let freq = 0;
let counter = 0;
let interval = null;
let reset = false;

// ===== Audio Setup =====
const input = document.getElementById("input");
const color_picker = document.getElementById("color");
const vol_slider = document.getElementById("vol-slider");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();
const oscillator = audioCtx.createOscillator();

oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);
oscillator.type = "sine";
oscillator.start();
gainNode.gain.value = 0;

// ===== Note Map =====
const notenames = new Map([
  ["C", 261.6],
  ["D", 293.7],
  ["E", 329.6],
  ["F", 349.2],
  ["G", 392.0],
  ["A", 440.0],
  ["B", 493.9],
]);

// ===== Sequencing Variables =====
let timepernote = 0;
let length = 0;
let repeat = null;
let setting = null;

// ===== Functions =====
function frequency(pitch) {
  freq = pitch / 10000;

  gainNode.gain.setValueAtTime(vol_slider.value / 100, audioCtx.currentTime);
  setting = setInterval(() => {
    gainNode.gain.value = vol_slider.value / 100;
  }, 1);

  oscillator.frequency.setValueAtTime(pitch, audioCtx.currentTime);

  const stopTime = timepernote - 100;
  setTimeout(() => {
    clearInterval(setting);
    gainNode.gain.value = 0;
  }, stopTime);
}

function line() {
  // smooth sine drawing
  y = height / 2 + ((vol_slider.value / 100) * 40) *
      Math.sin(x * (2 * Math.PI * freq * (0.5 * length)));

  ctx.strokeStyle = color_picker.value;
  ctx.lineWidth = 2;
  ctx.lineTo(x, y);
  ctx.stroke();

  // smaller step for smoothness
  x += 2;
  counter++;

  // stop after note duration
  if (counter > (timepernote / 10)) {
    clearInterval(interval);
  }
}

function drawWave() {
  clearInterval(interval);
  if (reset) {
    ctx.clearRect(0, 0, width, height);
    x = 0;
    y = height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    reset = false;
  }
  counter = 0;
  interval = setInterval(line, 10);
}

function handle() {
  audioCtx.resume();
  gainNode.gain.value = 0;
  reset = true;

  const usernotes = String(input.value).toUpperCase();
  const noteslist = [];
  for (let ch of usernotes) {
    if (notenames.has(ch)) noteslist.push(notenames.get(ch));
  }
  if (noteslist.length === 0) return;

  length = noteslist.length;
  timepernote = 6000 / length;

  let j = 0;
  clearInterval(repeat);
  repeat = setInterval(() => {
    if (j < noteslist.length) {
      frequency(noteslist[j]);
      drawWave();
      j++;
    } else {
      clearInterval(repeat);
    }
  }, timepernote);
}


// ===== Start Recording =====
function startRecording() {
  const canvasStream = canvas.captureStream(20);
  const combinedStream = new MediaStream(); // Fixed typo

  canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track)); 

  const audioDestination = audioCtx.createMediaStreamDestination(); 
  gainNode.connect(audioDestination); 

  recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' }); 

  recorder.ondataavailable = e => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'recording.webm'; 
    a.click(); 
    URL.revokeObjectURL(url); 
  }

  recorder.start(); 
}

var is_recording = false; 
function toggle() {
  is_recording = !is_recording; 
  if (is_recording) {
    recording_toggle.innerHTML = "Stop Recording"; 
    startRecording(); 
  } else {
    recording_toggle.innerHTML = "Start Recording"; 
    recorder.stop(); 
  }
}
