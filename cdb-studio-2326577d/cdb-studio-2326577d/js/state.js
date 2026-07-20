'use strict';

let diagnosticsReport = null;

const $ = id => document.getElementById(id);
const canvas = $('canvas');
const measureCanvas = document.createElement('canvas');
const measureCtx = measureCanvas.getContext('2d');

let project;
let currentIndex = 0;
let selected = 'title';
let activeTab = 'import';
let advancedUi = localStorage.getItem('cdb-advanced-ui') === '1';
let saveTimer = null;
let toastTimer = null;
let history = [];
let historyIndex = -1;
let imageLibrary = [];
let personalTemplates = [];
let logoData = '';
let initialized = false;
let searchResults = [];
const historyImagePool = new Map();
const pointers = new Map();
let gesture = null;
let elementClipboard = null;
let lastTap = { time:0, key:'' };
let pendingImportImage = '';
let autoImageSearchRunning = false;
let paletteTarget = 'accent';
let cropMode = false;
let guideState = [];
let tmdbKey = '';
let avoidDuplicateImages = true;
let cautiousImageMode = false;
let selectionCycle = {x:0,y:0,keys:[],index:-1,time:0};
let qualityReport = null;
let pendingQualityExport = null;
let templateEditMode = false;
let pendingEditorialOutline = null;
let editorialOutlineSignature = '';
const EDITORIAL_STOP_WORDS = new Set('a ad al allo ai agli alla alle anche ancora avere che chi ci con contro cosa cui da dal dalla dalle dei del della delle di e ed era essere fa fra gli ha hanno i il in io la le lo ma mi ne nei nel nella nelle non o per più poi quale quando quanto questa queste questi questo se senza si sia sono su sul sulla tra un una uno come dopo prima molto tutto tutti tutte ogni può possono perché mentre invece dove già solo stesso stessa degli delle loro suo sua suoi sue nel nello nelle sullo dagli dalle'.split(/\s+/));
const EDITORIAL_ROLE_LABELS={context:'Contesto',fact:'Punto chiave',detail:'Dettaglio',quote:'Citazione',impact:'Conseguenza',critique:'Lettura critica',conclusion:'Conclusione'};
const IMAGE_INTENT_LABELS={poster:'Poster / cover',backdrop:'Scena / fondale',profile:'Persona / intervista',behind:'Dietro le quinte',audience:'Sala / pubblico',logo:'Logo del titolo'};
const AUTO_APPROVE_SCORE=92;
let reviewQueueCursor=-1;

let instagramImportSession={
  status:'idle',sourceUrl:'',method:'',items:[],combinedText:'',caption:'',lastError:'',updatedAt:null
};
let instagramOcrBusy=false;

let generatorSource='url';

let contentJsonValidationTimer=null;
