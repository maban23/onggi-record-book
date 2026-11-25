// 예제 4: 지역 날씨를 조회하고 방명록은 브라우저에 저장한다.

const defaultEntries = [
    { name: '하늘', message: '오늘도 좋은 하루 보내세요 ☀️', date: '2026. 11. 24.' },
    { name: '바다', message: '포근한 분위기가 참 좋아요. 잠시 쉬어 갑니다!', date: '2026. 11. 23.' },
    { name: '초록', message: '지역별 날씨까지 볼 수 있어 유용하네요 🌿', date: '2026. 11. 22.' }
];

const weatherDescriptions = {
    0: ['맑음', '☀️'],
    1: ['대체로 맑음', '🌤️'],
    2: ['구름 조금', '⛅'],
    3: ['흐림', '☁️'],
    45: ['안개', '🌫️'],
    48: ['안개', '🌫️'],
    51: ['이슬비', '🌦️'],
    53: ['이슬비', '🌦️'],
    55: ['이슬비', '🌧️'],
    56: ['어는 이슬비', '🌧️'],
    57: ['어는 이슬비', '🌧️'],
    61: ['비', '🌧️'],
    63: ['비', '🌧️'],
    65: ['강한 비', '🌧️'],
    66: ['어는 비', '🌧️'],
    67: ['어는 비', '🌧️'],
    71: ['눈', '🌨️'],
    73: ['눈', '🌨️'],
    75: ['많은 눈', '❄️'],
    77: ['싸락눈', '🌨️'],
    80: ['소나기', '🌦️'],
    81: ['소나기', '🌧️'],
    82: ['강한 소나기', '🌧️'],
    85: ['눈 소나기', '🌨️'],
    86: ['강한 눈 소나기', '❄️'],
    95: ['뇌우', '⛈️'],
    96: ['우박 동반 뇌우', '⛈️'],
    99: ['강한 뇌우', '⛈️']
};

const weatherSearchForms = document.querySelectorAll('[data-weather-search-form]');
const weatherResults = document.querySelectorAll('[data-weather-result]');
const tarotResult = document.querySelector('[data-tarot-result]');
const tarotDrawButton = document.querySelector('[data-tarot-draw]');
const currencyForm = document.querySelector('[data-currency-form]');
const currencyAmount = document.querySelector('[data-currency-amount]');
const currencyBase = document.querySelector('[data-currency-base]');
const currencyTarget = document.querySelector('[data-currency-target]');
const currencyOutput = document.querySelector('[data-currency-output]');
const currencyRate = document.querySelector('[data-currency-rate]');
const entryList = document.querySelector('[data-entry-list]');
const entryCount = document.querySelector('[data-entry-count]');
const guestbookForm = document.querySelector('[data-guestbook-form]');
const formStatus = document.querySelector('[data-form-status]');
const pageLinks = document.querySelectorAll('[data-page-link]');
const pages = document.querySelectorAll('.page');
const storageKey = 'example4-guestbook-entries';
let latestWeatherRequest = 0;
let latestCurrencyRequest = 0;
let currentExchangeRates = null;
let currentRatesBase = '';
let currentRatesUpdatedAt = '';
let currencyRequestInProgress = false;

const tarotCards = [
    { title: '태양', symbol: '☀️', message: '밝은 에너지가 주변으로 퍼지는 날이에요. 자신 있게 한 걸음 내디뎌 보세요.' },
    { title: '별', symbol: '⭐', message: '작은 희망이 길을 비춰 줘요. 서두르지 말고 마음이 가는 방향을 살펴보세요.' },
    { title: '힘', symbol: '🦁', message: '차분하고 다정한 태도가 좋은 변화를 만들 수 있어요. 자신을 믿어 보세요.' },
    { title: '은둔자', symbol: '🕯️', message: '잠시 멈춰 생각을 정리하기 좋은 날이에요. 조용한 시간이 답을 찾아줄 수 있어요.' },
    { title: '절제', symbol: '🌈', message: '서로 다른 것들 사이에서 균형을 찾아보세요. 천천히 조율하면 괜찮아질 거예요.' },
    { title: '세계', symbol: '🌍', message: '작은 마무리가 다음 시작을 열어줘요. 지금까지 해온 일을 스스로 칭찬해 주세요.' }
];

function showPage(pageName) {
    const targetPage = document.querySelector(`#${pageName}`);
    if (!targetPage) return;

    pages.forEach((page) => page.classList.toggle('is-active', page === targetPage));
    pageLinks.forEach((link) => {
        if (link.dataset.pageLink === pageName) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
    if (pageName === 'home' && !currencyRequestInProgress && currentRatesBase !== currencyBase.value) {
        loadCurrencyRates();
    }
}

pageLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const pageName = link.dataset.pageLink;
        showPage(pageName);
        history.replaceState(null, '', `#${pageName}`);
    });
});

if (location.hash) showPage(location.hash.slice(1));

function getWeatherDescription(code) {
    return weatherDescriptions[code] || ['날씨 정보', '🌡️'];
}

const commonRegionNames = {
    '서울': '서울특별시',
    '서울시': '서울특별시',
    '부산': '부산광역시',
    '부산시': '부산광역시',
    '대구': '대구광역시',
    '대구시': '대구광역시',
    '인천': '인천광역시',
    '인천시': '인천광역시',
    '광주': '광주광역시',
    '광주시': '광주광역시',
    '대전': '대전광역시',
    '대전시': '대전광역시',
    '울산': '울산광역시',
    '울산시': '울산광역시',
    '세종': 'Sejong',
    '세종시': 'Sejong',
    '제주': '제주시',
    '제주도': '제주시'
};

function getLocationQueries(query) {
    const alias = commonRegionNames[query];
    const cityName = /^[가-힣]+$/.test(query) && !/(시|군|구|도|읍|면|동)$/.test(query)
        ? `${query}시`
        : query;
    return [...new Set([alias, cityName, query].filter(Boolean))];
}

async function findLocation(query) {
    for (const name of getLocationQueries(query)) {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.search = new URLSearchParams({
            name,
            count: '10',
            language: 'ko',
            format: 'json',
            countryCode: 'KR'
        }).toString();

        const response = await fetch(url);
        if (!response.ok) throw new Error(`지역 검색 실패: ${response.status}`);
        const data = await response.json();
        const location = data.results && data.results.find((result) => result.country_code === 'KR');
        if (location) return location;
    }

    return null;
}

function showWeatherMessage(message, isError) {
    weatherResults.forEach((result) => {
        const paragraph = document.createElement('p');
        paragraph.className = `weather-result-message${isError ? ' is-error' : ''}`;
        paragraph.textContent = message;
        result.replaceChildren(paragraph);
    });
}

function renderWeatherResult(location, weather) {
    const [description, symbol] = getWeatherDescription(weather.weather_code);
    const locality = [location.admin1, location.admin2]
        .filter((name, index, names) => name && name !== location.name && names.indexOf(name) === index)
        .join(' · ');
    const time = new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date());

    weatherResults.forEach((result) => {
        const card = document.createElement('article');
        card.className = 'weather-result-card';

        const locationInfo = document.createElement('div');
        const locationLabel = document.createElement('div');
        locationLabel.className = 'weather-result-location';
        locationLabel.textContent = locality || location.country || '대한민국';

        const locationName = document.createElement('p');
        locationName.className = 'weather-result-name';
        locationName.textContent = location.name;

        const updated = document.createElement('p');
        updated.className = 'weather-result-time';
        updated.textContent = `현재 기온 · ${time} 조회`;
        locationInfo.append(locationLabel, locationName, updated);

        const reading = document.createElement('div');
        reading.className = 'weather-result-reading';

        const weatherSymbol = document.createElement('span');
        weatherSymbol.className = 'weather-result-symbol';
        weatherSymbol.setAttribute('aria-hidden', 'true');
        weatherSymbol.textContent = symbol;

        const temperatureInfo = document.createElement('div');
        const temperature = document.createElement('div');
        temperature.className = 'weather-result-temperature';
        temperature.textContent = `${Math.round(weather.temperature_2m)}°`;

        const weatherDescription = document.createElement('div');
        weatherDescription.className = 'weather-result-description';
        weatherDescription.textContent = description;
        temperatureInfo.append(temperature, weatherDescription);
        reading.append(weatherSymbol, temperatureInfo);
        card.append(locationInfo, reading);
        result.replaceChildren(card);
    });
}

weatherSearchForms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const query = String(new FormData(form).get('location') || '').trim();
        if (!query) {
            showWeatherMessage('조회할 지역 이름을 입력해 주세요.', true);
            return;
        }

        const requestId = ++latestWeatherRequest;
        showWeatherMessage('지역과 현재 기온을 조회하고 있어요…', false);

        try {
            const location = await findLocation(query);
            if (requestId !== latestWeatherRequest) return;
            if (!location) {
                showWeatherMessage('지역을 찾지 못했어요. 예: 서울, 수원, 제주', true);
                return;
            }

            const url = new URL('https://api.open-meteo.com/v1/forecast');
            url.search = new URLSearchParams({
                latitude: location.latitude,
                longitude: location.longitude,
                current: 'temperature_2m,weather_code',
                timezone: 'Asia/Seoul'
            }).toString();

            const response = await fetch(url);
            if (!response.ok) throw new Error(`날씨 조회 실패: ${response.status}`);
            const data = await response.json();
            if (!data.current || typeof data.current.temperature_2m !== 'number') {
                throw new Error('현재 기온 정보가 없습니다.');
            }
            if (requestId === latestWeatherRequest) renderWeatherResult(location, data.current);
        } catch (error) {
            console.error('지역 날씨를 조회하지 못했습니다.', error);
            if (requestId === latestWeatherRequest) {
                showWeatherMessage('날씨 조회에 실패했어요. 잠시 후 다시 시도해 주세요.', true);
            }
        }
    });
});

function drawTarotCard() {
    const card = tarotCards[Math.floor(Math.random() * tarotCards.length)];
    const cardElement = document.createElement('div');
    cardElement.className = 'tarot-draw';

    const symbol = document.createElement('div');
    symbol.className = 'tarot-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = card.symbol;

    const details = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'tarot-title';
    title.textContent = card.title;

    const message = document.createElement('p');
    message.className = 'tarot-message';
    message.textContent = card.message;
    details.append(title, message);
    cardElement.append(symbol, details);
    tarotResult.replaceChildren(cardElement);
}

tarotDrawButton.addEventListener('click', drawTarotCard);

function formatCurrencyAmount(amount, currency, maxFractionDigits) {
    const fractionDigits = maxFractionDigits ?? (currency === 'KRW' || currency === 'JPY' ? 0 : 2);
    return new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: fractionDigits
    }).format(amount);
}

function renderCurrencyResult() {
    if (!currentExchangeRates || currentRatesBase !== currencyBase.value) return;

    const amount = Number(currencyAmount.value);
    const base = currencyBase.value;
    const target = currencyTarget.value;
    const rate = currentExchangeRates[target];

    if (!Number.isFinite(amount) || amount <= 0) {
        currencyOutput.classList.add('currency-error');
        currencyOutput.textContent = '0보다 큰 금액을 입력해 주세요.';
        return;
    }
    if (typeof rate !== 'number') {
        currencyOutput.classList.add('currency-error');
        currencyOutput.textContent = '선택한 통화의 환율 정보가 없어요.';
        return;
    }

    currencyOutput.classList.remove('currency-error');
    currencyOutput.textContent = `${formatCurrencyAmount(amount, base)} ${base} = ${formatCurrencyAmount(amount * rate, target)} ${target}`;
    currencyRate.textContent = `1 ${base} = ${formatCurrencyAmount(rate, target, 6)} ${target}${currentRatesUpdatedAt}`;
}

async function loadCurrencyRates() {
    const requestId = ++latestCurrencyRequest;
    const base = currencyBase.value;
    currencyRequestInProgress = true;
    currencyOutput.classList.remove('currency-error');
    currencyOutput.textContent = '환율을 불러오는 중…';
    currencyRate.textContent = '';
    currentRatesUpdatedAt = '';

    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
        if (!response.ok) throw new Error(`환율 요청 실패: ${response.status}`);
        const data = await response.json();
        if (data.result !== 'success' || !data.rates || data.base_code !== base) {
            throw new Error('환율 정보를 확인할 수 없습니다.');
        }
        if (requestId !== latestCurrencyRequest) return;

        currentExchangeRates = data.rates;
        currentRatesBase = base;
        currencyRequestInProgress = false;
        const updatedAt = new Date(data.time_last_update_utc);
        currentRatesUpdatedAt = ` · 기준 ${new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Seoul'
        }).format(updatedAt)}`;
        renderCurrencyResult();
    } catch (error) {
        console.error('환율 정보를 불러오지 못했습니다.', error);
        if (requestId === latestCurrencyRequest) {
            currencyRequestInProgress = false;
            currencyOutput.classList.add('currency-error');
            currencyOutput.textContent = '환율 조회에 실패했어요. 잠시 후 다시 시도해 주세요.';
        }
    }
}

currencyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loadCurrencyRates();
});
currencyBase.addEventListener('change', loadCurrencyRates);
currencyTarget.addEventListener('change', renderCurrencyResult);
currencyAmount.addEventListener('input', renderCurrencyResult);

function loadEntries() {
    try {
        const savedEntries = localStorage.getItem(storageKey);
        if (!savedEntries) return [...defaultEntries];
        const parsedEntries = JSON.parse(savedEntries);
        if (!Array.isArray(parsedEntries)) throw new Error('저장된 방명록 형식이 올바르지 않습니다.');
        return parsedEntries;
    } catch (error) {
        console.error('저장된 방명록을 불러오지 못했습니다.', error);
        return [...defaultEntries];
    }
}

let entries = loadEntries();

function renderEntries() {
    entryCount.textContent = `총 ${entries.length}개`;

    if (entries.length === 0) {
        entryList.innerHTML = '<p class="empty-message">첫 번째 인사를 남겨 주세요. 💌</p>';
        return;
    }

    entryList.replaceChildren();
    entries.forEach((entry) => {
        const article = document.createElement('article');
        article.className = 'entry';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = '💬';

        const content = document.createElement('div');
        content.className = 'entry-content';

        const meta = document.createElement('div');
        meta.className = 'entry-meta';

        const name = document.createElement('span');
        name.className = 'entry-name';
        name.textContent = entry.name;

        const date = document.createElement('time');
        date.className = 'entry-date';
        date.textContent = entry.date;

        const message = document.createElement('p');
        message.className = 'entry-message';
        message.textContent = entry.message;

        meta.append(name, date);
        content.append(meta, message);
        article.append(avatar, content);
        entryList.append(article);
    });
}

guestbookForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formStatus.textContent = '';

    const formData = new FormData(guestbookForm);
    const name = String(formData.get('name') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!name || !message) {
        formStatus.textContent = '이름과 메시지를 모두 입력해 주세요.';
        return;
    }

    const date = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()).replace(/\. /g, '. ').replace(/\.$/, '.');
    entries.unshift({ name, message, date });

    try {
        localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch (error) {
        console.error('방명록을 브라우저에 저장하지 못했습니다.', error);
        formStatus.textContent = '글은 추가했지만 브라우저 저장에 실패했어요.';
    }

    renderEntries();
    guestbookForm.reset();
});

renderEntries();
