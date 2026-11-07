let player;
let subtitles = [];
let currentIndex = 0;

function onYouTubeIframeAPIReady() {
  // API 준비 완료
}

document.getElementById('start-btn').addEventListener('click', async () => {
  const urlInput = document.getElementById('youtube-url').value;
  const fileInput = document.getElementById('subtitle-file').files[0];

  const videoId = extractVideoId(urlInput);

  if (!videoId) {
    alert('올바른 유튜브 URL을 입력하세요.');
    return;
  }

  if (!fileInput) {
    alert('자막 파일(.srt 또는 .vtt)을 업로드해주세요.');
    return;
  }

  const text = await fileInput.text();
  subtitles = parseSRT(text);

  if (subtitles.length === 0) {
    alert('자막을 파싱하지 못했습니다.');
    return;
  }

  document.querySelector('.input-section').classList.add('hidden');
  document.getElementById('game-section').classList.remove('hidden');

  initPlayer(videoId);
});

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

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
      'onReady': onPlayerReady
    }
  });
}

function onPlayerReady(event) {
  updateGameUI();
}

const targetDisplay = document.getElementById('target-text');
const typingInput = document.getElementById('typing-input');
const progressDisplay = document.getElementById('progress');

function updateGameUI() {
  if (currentIndex < subtitles.length) {
    const currentSub = subtitles[currentIndex];
    targetDisplay.textContent = currentSub.text;
    progressDisplay.textContent = `${currentIndex + 1} / ${subtitles.length}`;
    
    player.seekTo(currentSub.start);
    player.playVideo();
  } else {
    targetDisplay.textContent = "🎉 축하합니다! 모든 문장을 완료했습니다.";
    typingInput.disabled = true;
  }
}

typingInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const inputVal = typingInput.value.trim();
    const targetVal = subtitles[currentIndex].text.trim();

    if (inputVal === targetVal) {
      currentIndex++;
      typingInput.value = '';
      updateGameUI();
    } else {
      typingInput.style.borderColor = '#ff4757';
      setTimeout(() => typingInput.style.borderColor = '#333', 500);
    }
  }
});
