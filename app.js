let player;
let subtitles = [
  { start: 0, end: 3, text: "Never gonna give you up" },
  { start: 3, end: 6, text: "Never gonna let you down" },
  { start: 6, end: 10, text: "Never gonna run around and desert you" }
];
let currentIndex = 0;
let totalTypedChars = 0;
let totalErrors = 0;
let startTime = null;
let isPausedByTyping = false;

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

document.getElementById('start-btn').addEventListener('click', async () => {
  const urlInput = document.getElementById('youtube-url').value;
  const fileInput = document.getElementById('subtitle-file').files[0];
  const videoId = extractVideoId(urlInput);

  if (!videoId) {
    alert('올바른 유튜브 URL을 입력해 주세요.');
    return;
  }

  if (fileInput) {
    const text = await fileInput.text();
    const parsed = parseSRT(text);
    if (parsed.length > 0) subtitles = parsed;
  }

  document.getElementById('input-section').classList.add('hidden');
  document.getElementById('game-section').classList.remove('hidden');

  initPlayer(videoId);
});

function parseSRT(data) {
  const regex = /(\d+)
(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)
([\s\S]*?)(?=
{2,}|
*$)/g;
  let result = [];
  let match;
  while ((match = regex.exec(data)) !== null) {
    result.push({
      start: timeToSeconds(match[2]),
      end: timeToSeconds(match[3]),
      text: match[4].replace(/
/g, ' ').trim()
    });
  }
  return result;
}

function timeToSeconds(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(':');
  const [secs, millis] = seconds.split(',');
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secs) + parseInt(millis) / 1000;
}

function initPlayer(videoId) {
  player = new YT.Player('player', {
    height: '360',
    width: '640',
    videoId: videoId,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  startTime = new Date();
  loadCurrentSubtitle();
  setInterval(checkVideoSync, 200); // 0.2초 간격 구간 동기화 확인
}

function onPlayerStateChange(event) {
  // 재생 관련 상태 제어
}

// 영상 속도와 타자 진행속도 체크
function checkVideoSync() {
  if (!player || !player.getCurrentTime || currentIndex >= subtitles.length) return;
  
  const currentTime = player.getCurrentTime();
  const currentSub = subtitles[currentIndex];

  // 영상 시간이 자막 종료 시간에 도달했는데 아직 타자를 완송 못했으면 일시정지!
  if (currentTime >= currentSub.end && !isPausedByTyping) {
    player.pauseVideo();
    isPausedByTyping = true;
  }
}

const targetDisplay = document.getElementById('target-display');
const typingInput = document.getElementById('typing-input');
const wpmDisplay = document.getElementById('wpm-val');
const errorDisplay = document.getElementById('error-val');
const progressDisplay = document.getElementById('progress-val');
const feedbackOverlay = document.getElementById('feedback-overlay');

function loadCurrentSubtitle() {
  if (currentIndex >= subtitles.length) {
    targetDisplay.innerHTML = "<span style='color: #4ade80;'>🎉 모든 자막 타자를 완료하셨습니다!</span>";
    typingInput.disabled = true;
    player.pauseVideo();
    return;
  }

  const currentSub = subtitles[currentIndex];
  renderText('');
  progressDisplay.textContent = `${currentIndex + 1} / ${subtitles.length}`;
  
  player.seekTo(currentSub.start);
  player.playVideo();
  isPausedByTyping = false;
}

// 실시간 빨간색 / 초록색 하이라이트 렌더링
function renderText(inputVal) {
  const targetText = subtitles[currentIndex].text;
  let html = '';
  let currentErrors = 0;

  for (let i = 0; i < targetText.length; i++) {
    const targetChar = targetText[i];
    const inputChar = inputVal[i];

    if (inputChar == null) {
      html += `<span class="char-pending">${targetChar}</span>`;
    } else if (inputChar === targetChar) {
      html += `<span class="char-correct">${targetChar}</span>`;
    } else {
      html += `<span class="char-incorrect">${targetChar}</span>`;
      currentErrors++;
    }
  }

  targetDisplay.innerHTML = html;
  return currentErrors;
}

// 실시간 타자 입력 처리 및 통계 계산
typingInput.addEventListener('input', (e) => {
  const inputVal = typingInput.value;
  const targetText = subtitles[currentIndex].text;
  const currentErrors = renderText(inputVal);

  // 실시간 통계 계산 (CPM / 오타율)
  const elapsedMinutes = (new Date() - startTime) / 60000;
  const currentTypedCount = totalTypedChars + inputVal.length;
  const cpm = elapsedMinutes > 0 ? Math.round(currentTypedCount / elapsedMinutes) : 0;
  
  const totalErrCount = totalErrors + currentErrors;
  const errorRate = currentTypedCount > 0 ? ((totalErrCount / currentTypedCount) * 100).toFixed(1) : 0;

  wpmDisplay.innerHTML = `${cpm} <small>CPM</small>`;
  errorDisplay.textContent = `${errorRate}%`;

  // 문장을 완벽히 입력했을 때
  if (inputVal === targetText) {
    totalTypedChars += targetText.length;
    totalErrors += currentErrors;

    showFeedback();

    currentIndex++;
    typingInput.value = '';
    loadCurrentSubtitle();
  }
});

// GOOD JOB / EXCELLENT 팝업 연출
function showFeedback() {
  const feedbacks = ["GOOD JOB!", "EXCELLENT!", "PERFECT!", "AWESOME!"];
  const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
  
  feedbackOverlay.textContent = randomFeedback;
  feedbackOverlay.classList.remove('hidden');

  // 애니메이션 재발동을 위한 리셋
  feedbackOverlay.style.animation = 'none';
  feedbackOverlay.offsetHeight; 
  feedbackOverlay.style.animation = 'popUp 0.6s ease-out forwards';

  setTimeout(() => {
    feedbackOverlay.classList.add('hidden');
  }, 600);
}
