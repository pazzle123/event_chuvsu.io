document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // ПРОВЕРКА ЛОКАЛЬНОГО ЗАПУСКА
    // ============================================
    if (window.location.protocol === 'file:') {
        console.warn('⚠️ Запуск из файловой системы. CORS может не работать.');
        console.warn('📌 Используйте Live Server в VS Code или Python http.server');
    }

    // ============================================
    // КОНФИГУРАЦИЯ ЧГУ - НЕ МЕНЯТЬ!
    // ============================================
    const API_CONFIG = {
        baseUrl: 'https://www.chuvsu.ru/wp-json/wp/v2',
        endpoints: [
            '/news',
            '/posts',
            '/events',
            '/interview',
            '/posts?categories=5',
            '/posts?categories=7'
        ],
        perPage: 20,
        _embedded: true
    };

    // ============================================
    // КОНФИГУРАЦИЯ ФАКУЛЬТЕТОВ
    // ============================================
    const FACULTY_SOURCES = [
        {
            name: 'ИВТ',
            url: 'https://vt.chuvsu.ru/novosti/rss.xml',
            baseUrl: 'https://vt.chuvsu.ru',
            facultyId: 'ivt',
            emoji: '💻',
            parser: 'rss'
        },
        {
            name: 'Химфак',
            url: 'https://chimfac.chuvsu.ru/news',
            baseUrl: 'https://chimfac.chuvsu.ru',
            facultyId: 'chimfac',
            emoji: '🧪',
            parser: 'html'
        },
        {
            name: 'Энергетика',
            url: 'https://elf21.ru/news',
            facultyId: 'energo',
            emoji: '⚡',
            parser: 'link'
        },
        {
            name: 'Экономика',
            url: 'https://econom.chuvsu.ru/fakultet/kalendar-sobytij',
            facultyId: 'econom',
            emoji: '📈',
            parser: 'link'
        },
        {
            name: 'Юрфак',
            url: 'https://law-faculty.tilda.ws/law-faculty',
            facultyId: 'law',
            emoji: '⚖️',
            parser: 'link'
        }
    ];

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\' viewBox=\'0 0 400 200\'%3E%3Crect width=\'400\' height=\'200\' fill=\'%23667eea\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'white\' font-family=\'Arial\' font-size=\'24\'%3EЧГУ%3C/text%3E%3C/svg%3E';

    // Ключевые слова для определения факультета
    const FACULTY_KEYWORDS = {
        ivt: ['ивт', 'информационные технологии', 'программ', 'компьютер', 'it', 'software', 'разработк', 'цифров', 'данные', 'алгоритм', 'микроконтроллер', 'встраиваем', 'схемотехник', 'вычислительн', 'информатик', 'программировани', 'киберспорт', 'олимпиад по информатике', 'хакатон'],
        chimfac: ['хим', 'фармация', 'химическ', 'лаборатор', 'реактив', 'веществ', 'молекул', 'атом', 'рентген', 'спектр', 'органическ', 'неорганическ'],
        energo: ['энергетик', 'электро', 'энергия', 'power', 'electric', 'тепло', 'сеть', 'электротехник', 'электропривод', 'электроснабж'],
        econom: ['эконом', 'финанс', 'бизнес', 'management', 'economy', 'бухгалт', 'учёт', 'менеджмент', 'маркетинг', 'олимпиад по экономике'],
        law: ['право', 'юрид', 'правов', 'law', 'legal', 'законод', 'суд', 'юриспруденц', 'кодекс', 'конституц']
    };

    const CATEGORY_KEYWORDS = {
        science: ['наука', 'конференц', 'исслед', 'симпозиум', 'научн', 'семинар', 'доклад', 'публикац', 'олимпиад', 'хакатон', 'лаборатор'],
        sport: ['спорт', 'соревнов', 'турнир', 'чемпионат', 'физкультур', 'марафон', 'спартакиад', 'игры', 'кубок', 'баскетбол', 'киберспорт'],
        creative: ['творч', 'концерт', 'выставк', 'фестиваль', 'искусств', 'культура', 'театр', 'музыка'],
        conference: ['конференц', 'форум', 'симпозиум', 'круглый стол', 'вебинар', 'лекция', 'интенсив', 'семинар']
    };

    // === СОСТОЯНИЕ ===
    let allEvents = [];
    let currentTab = 'all';
    let currentCategory = 'all';
    let currentFaculty = 'all';

    // === ИНИЦИАЛИЗАЦИЯ ===
    function init() {
        setupTabs();
        setupFilters();
        loadEvents();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('#mainTabs .nav-link');
        tabs.forEach(btn => {
            btn.addEventListener('click', function() {
                tabs.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                currentTab = this.dataset.tab;
                
                const filters = document.getElementById('filtersSection');
                if (filters) {
                    filters.style.display = currentTab === 'all' ? 'block' : 'none';
                }
                
                filterAndRender();
            });
        });
    }

    function setupFilters() {
        const categoryBtns = document.querySelectorAll('#categoryNav .nav-link');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                categoryBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                filterAndRender();
            });
        });

        const facultyBtns = document.querySelectorAll('#facultyFilter .btn');
        facultyBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                facultyBtns.forEach(b => {
                    b.classList.remove('active', 'btn-secondary');
                    b.classList.add('btn-outline-secondary');
                });
                this.classList.add('active', 'btn-secondary');
                this.classList.remove('btn-outline-secondary');
                currentFaculty = this.dataset.faculty;
                filterAndRender();
            });
        });
    }

    // === ЗАГРУЗКА ДАННЫХ ===
    async function loadEvents() {
        const loader = document.getElementById('loader');
        const container = document.getElementById('catalogCardEvent');
        
        if (loader) loader.style.display = 'block';
        if (container) {
            container.innerHTML = '';
            if (loader) container.appendChild(loader);
        }

        try {
            console.log('=================================');
            console.log('🚀 НАЧИНАЕМ ЗАГРУЗКУ ДАННЫХ');
            console.log('=================================');
            
            // Загружаем ЧГУ
            const chguEvents = await fetchChguEvents();
            console.log(`✅ Загружено событий ЧГУ: ${chguEvents.length}`);
            
            // Загружаем все факультеты
            const facultyPromises = FACULTY_SOURCES.map(source => 
                fetchFacultyEvents(source).catch(() => [])
            );
            
            const facultyResults = await Promise.all(facultyPromises);
            const facultyEvents = facultyResults.flat();
            
            console.log(`✅ Всего загружено событий факультетов: ${facultyEvents.length}`);

            allEvents = [...chguEvents, ...facultyEvents];
            console.log(`📊 ВСЕГО СОБЫТИЙ: ${allEvents.length}`);

            // Удаляем дубликаты
            const uniqueEvents = [];
            const seen = new Set();
            
            allEvents.forEach(event => {
                const key = `${event.title?.rendered}-${event.link}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueEvents.push(event);
                }
            });
            
            allEvents = uniqueEvents;
            console.log(`📊 УНИКАЛЬНЫХ СОБЫТИЙ: ${allEvents.length}`);

            // Сортируем по дате
            allEvents.sort((a, b) => {
                const dateA = a.dateParsed ? new Date(a.dateParsed) : new Date(0);
                const dateB = b.dateParsed ? new Date(b.dateParsed) : new Date(0);
                return dateB - dateA;
            });
            
            console.log('=================================');
            console.log('✅ ЗАГРУЗКА ЗАВЕРШЕНА');
            console.log('=================================');
            
            filterAndRender();
            
        } catch (err) {
            console.error('❌ Ошибка загрузки:', err);
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <h5>😕 Ошибка загрузки</h5>
                        <p class="text-muted">Не удалось загрузить данные.</p>
                        <button class="btn btn-outline-primary" onclick="location.reload()">Обновить</button>
                    </div>`;
            }
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    // ============================================
    // ЗАГРУЗКА ЧГУ (API)
    // ============================================
    async function fetchChguEvents() {
        try {
            console.log('📡 Загрузка ЧГУ API...');
            let allPosts = [];
            
            for (const endpoint of API_CONFIG.endpoints) {
                try {
                    const url = `${API_CONFIG.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}_embed=true&per_page=${API_CONFIG.perPage}`;
                    const response = await fetchWithTimeout(url, 3000);
                    
                    if (response && response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data) && data.length > 0) {
                            allPosts = [...allPosts, ...data];
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            
            // Удаляем дубликаты
            const uniquePosts = [];
            const seen = new Set();
            
            allPosts.forEach(post => {
                if (post.id && !seen.has(post.id)) {
                    seen.add(post.id);
                    uniquePosts.push(post);
                }
            });
            
            return uniquePosts.map((item) => {
                let image = null;
                if (item._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
                    image = item._embedded['wp:featuredmedia'][0].source_url;
                }
                
                // Определяем факультет по ключевым словам
                let faculty = null;
                const text = `${item.title?.rendered || ''} ${item.content?.rendered || ''}`.toLowerCase();
                
                for (const [fac, keywords] of Object.entries(FACULTY_KEYWORDS)) {
                    if (keywords.some(kw => text.includes(kw))) {
                        faculty = fac;
                        break;
                    }
                }
                
                return {
                    id: `chgu-${item.id}`,
                    title: { rendered: item.title?.rendered || item.title || 'Без названия' },
                    content: { rendered: item.content?.rendered || item.excerpt?.rendered || '' },
                    excerpt: { rendered: item.excerpt?.rendered || '' },
                    link: item.link || '#',
                    date: item.date || new Date().toISOString(),
                    dateParsed: item.date ? new Date(item.date) : new Date(),
                    image: image,
                    _source: 'ЧГУ',
                    _isFacultySource: false,
                    _detectedFaculty: faculty
                };
            });
            
        } catch (error) {
            return [];
        }
    }

    // ============================================
    // ЗАГРУЗКА ФАКУЛЬТЕТОВ
    // ============================================
    async function fetchFacultyEvents(source) {
        try {
            console.log(`📥 Загружаем ${source.name}...`);
            
            if (source.parser === 'rss') {
                return await fetchViaRss2json(source);
            } else if (source.parser === 'html') {
                return await parseChimfacNews(source);
            } else {
                return [createFacultyLink(source)];
            }
        } catch (error) {
            return [createFacultyLink(source)];
        }
    }

    // ============================================
    // ПАРСИНГ ХИМФАКА (HTML)
    // ============================================
    async function parseChimfacNews(source) {
        try {
            console.log(`  📄 Парсим HTML для ${source.name}...`);
            
            // Список прокси для обхода CORS
            const proxies = [
                `https://api.allorigins.win/raw?url=${encodeURIComponent(source.url)}`,
                `https://corsproxy.io/?${encodeURIComponent(source.url)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(source.url)}`,
                `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(source.url)}`
            ];
            
            let html = null;
            
            for (const proxyUrl of proxies) {
                try {
                    console.log(`    🔗 Пробуем прокси: ${proxyUrl}`);
                    const response = await fetchWithTimeout(proxyUrl, 5000);
                    
                    if (response && response.ok) {
                        html = await response.text();
                        if (html && html.length > 100) {
                            console.log(`    ✅ Прокси работает, размер: ${html.length} байт`);
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`    ❌ Прокси не работает`);
                    continue;
                }
            }
            
            if (!html) {
                console.log(`  ❌ Не удалось загрузить HTML для ${source.name}`);
                return [createFacultyLink(source)];
            }
            
            // Парсим HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const news = [];
            
            // Находим все элементы списка новостей
            // На странице они в тегах <li>
            const items = doc.querySelectorAll('ul li');
            console.log(`    Найдено элементов: ${items.length}`);
            
            items.forEach((item, index) => {
                const text = item.textContent?.trim() || '';
                if (!text) return;
                
                // Извлекаем дату (формат DD.MM.YYYY)
                const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                
                let date = '';
                let parsedDate = new Date();
                let title = text;
                
                if (dateMatch) {
                    date = dateMatch[0];
                    parsedDate = new Date(dateMatch[3], dateMatch[2] - 1, dateMatch[1]);
                    // Убираем дату из заголовка
                    title = text.replace(date, '').trim();
                }
                
                // Если заголовок слишком длинный, обрезаем
                if (title.length > 100) {
                    title = title.substring(0, 100) + '...';
                }
                
                news.push({
                    id: `${source.facultyId}-${index}-${Date.now()}`,
                    title: { rendered: title || 'Новость химфака' },
                    content: { rendered: text },
                    excerpt: { rendered: text.length > 200 ? text.substring(0, 200) + '...' : text },
                    link: source.url, // Ссылка на общую страницу
                    date: date || new Date().toISOString().split('T')[0],
                    dateParsed: parsedDate,
                    image: null,
                    _source: source.name,
                    _isFacultySource: true,
                    _facultyId: source.facultyId,
                    _emoji: source.emoji
                });
            });
            
            console.log(`  ✅ Найдено новостей: ${news.length}`);
            
            if (news.length === 0) {
                return [createFacultyLink(source)];
            }
            
            return news;
            
        } catch (error) {
            console.error(`❌ Ошибка парсинга ${source.name}:`, error);
            return [createFacultyLink(source)];
        }
    }

    // Загрузка через RSS2JSON (для ИВТ)
    async function fetchViaRss2json(source) {
        try {
            const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
            const response = await fetch(rss2jsonUrl);
            
            if (!response.ok) return [createFacultyLink(source)];
            
            const data = await response.json();
            if (!data?.items?.length) return [createFacultyLink(source)];
            
            return data.items.map((item, index) => {
                const title = item.title || 'Без названия';
                let link = item.link || '#';
                const description = item.description || '';
                const pubDate = item.pubDate || new Date().toISOString();
                
                let image = item.thumbnail || null;
                if (!image && description) {
                    const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);
                    image = imgMatch ? imgMatch[1] : null;
                }
                
                const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
                
                return {
                    id: `${source.facultyId}-${index}-${Date.now()}`,
                    title: { rendered: title },
                    content: { rendered: description },
                    excerpt: { rendered: cleanDescription.slice(0, 200) },
                    link: link,
                    date: pubDate,
                    dateParsed: new Date(pubDate),
                    image: image,
                    _source: source.name,
                    _isFacultySource: true,
                    _facultyId: source.facultyId,
                    _emoji: source.emoji
                };
            });
            
        } catch (error) {
            return [createFacultyLink(source)];
        }
    }

    // Создаем карточку-ссылку для факультета
    function createFacultyLink(source) {
        return {
            id: `${source.facultyId}-link-${Date.now()}`,
            title: { rendered: `${source.emoji} ${source.name} - перейти на сайт` },
            content: { rendered: `Перейдите на официальный сайт факультета, чтобы посмотреть актуальные новости и мероприятия.` },
            excerpt: { rendered: `Актуальные новости ${source.name}` },
            link: source.url,
            date: new Date().toISOString(),
            dateParsed: new Date(),
            image: null,
            _source: source.name,
            _isFacultySource: true,
            _facultyId: source.facultyId,
            _emoji: source.emoji,
            isLink: true
        };
    }

    // Вспомогательная функция для fetch с таймаутом
    async function fetchWithTimeout(url, timeoutMs = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json, text/html, application/xml' }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            return null;
        }
    }

    // === ФИЛЬТРАЦИЯ И ОТРИСОВКА ===
    function filterAndRender() {
        let filtered = [...allEvents];

        if (currentTab !== 'all') {
            filtered = filtered.filter(e => e._facultyId === currentTab);
        } else {
            if (currentCategory !== 'all') {
                const keywords = CATEGORY_KEYWORDS[currentCategory] || [];
                filtered = filtered.filter(e => {
                    const text = getTextContent(e).toLowerCase();
                    return keywords.some(kw => text.includes(kw));
                });
            }

            if (currentFaculty !== 'all') {
                filtered = filtered.filter(e => {
                    if (e._isFacultySource) {
                        return e._facultyId === currentFaculty;
                    }
                    return e._detectedFaculty === currentFaculty;
                });
            }
        }

        renderEvents(filtered);
    }

    function getTextContent(event) {
        const title = typeof event.title === 'string' ? event.title : (event.title?.rendered || '');
        const content = typeof event.content === 'string' ? event.content : (event.content?.rendered || '');
        const excerpt = typeof event.excerpt === 'string' ? event.excerpt : (event.excerpt?.rendered || '');
        return `${title} ${content} ${excerpt}`.toLowerCase();
    }

    function renderEvents(events) {
        const container = document.getElementById('catalogCardEvent');
        if (!container) return;
        
        if (!events.length) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <h5>😕 Нет мероприятий</h5>
                    <p class="text-muted">На данный момент мероприятия не найдены.</p>
                    <button class="btn btn-outline-primary" onclick="location.reload()">Обновить</button>
                </div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="row g-4">
                ${events.map(createCard).join('')}
            </div>
            <div class="text-center mt-4 text-muted small">
                Показано: ${events.length} событий
            </div>`;
    }

    function createCard(event) {
        const img = event.image || PLACEHOLDER_IMAGE;
        const date = formatDate(event.dateParsed);
        let faculty = getFacultyLabel(event);
        const excerpt = getExcerpt(event);
        const link = event.link || '#';
        const title = typeof event.title === 'string' ? event.title : (event.title?.rendered || 'Без названия');

        if (event._isFacultySource && event._emoji) {
            faculty = `${event._emoji} ${event._source}`;
        } else if (!event._isFacultySource && event._detectedFaculty) {
            const names = { 
                ivt: '💻 ИВТ', 
                chimfac: '🧪 Химфак', 
                energo: '⚡ Энергетика', 
                econom: '📈 Экономика', 
                law: '⚖️ Юрфак' 
            };
            faculty = names[event._detectedFaculty] || event._detectedFaculty;
        }

        const cardClass = event.isLink ? 'border-info bg-light' : '';

        return `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm hover-shadow ${cardClass}">
                    <div style="position: relative; overflow: hidden; min-height: 200px;">
                        <img src="${img}" 
                             class="card-img-top" 
                             alt="${title}"
                             style="height: 200px; width: 100%; object-fit: cover;"
                             onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}';">
                        ${event._isFacultySource ? `<span class="badge bg-primary source-tag">${event._emoji} ${event._source}</span>` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        ${faculty ? `<span class="badge bg-info text-dark faculty-badge mb-2">${faculty}</span>` : ''}
                        <h5 class="card-title fs-6 mb-2">${title}</h5>
                        <div class="event-date mb-2 text-muted small">📅 ${date}</div>
                        <p class="card-text small text-muted flex-grow-1">${excerpt}</p>
                        <a href="${link}" class="btn btn-primary btn-sm mt-3" target="_blank" rel="noopener noreferrer">
                            Подробнее →
                        </a>
                    </div>
                </div>
            </div>`;
    }

    function formatDate(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'Дата не указана';
        }
        try {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric'
            });
        } catch {
            return 'Дата не указана';
        }
    }

    function getExcerpt(event) {
        let text = '';
        
        if (event.excerpt) {
            text = typeof event.excerpt === 'string' ? event.excerpt : (event.excerpt?.rendered || '');
        }
        if (!text && event.content) {
            text = typeof event.content === 'string' ? event.content : (event.content?.rendered || '');
        }
        if (!text) text = 'Описание мероприятия...';
        
        text = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        return text.length > 120 ? text.slice(0, 120) + '…' : text;
    }

    function getFacultyLabel(event) {
        if (event._isFacultySource && event._facultyId) {
            const names = { 
                ivt: '💻 ИВТ', 
                chimfac: '🧪 Химфак', 
                energo: '⚡ Энергетика', 
                econom: '📈 Экономика', 
                law: '⚖️ Юрфак' 
            };
            return names[event._facultyId] || event._facultyId;
        }
        return null;
    }

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .hover-shadow:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important; transition: all 0.2s ease; }
            .source-tag { position: absolute; top: 10px; right: 10px; font-size: 0.75rem; padding: 0.35rem 0.5rem; }
            .faculty-badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; }
            .border-info { border: 2px solid #17a2b8 !important; }
            .card-img-top { transition: transform 0.3s ease; }
            .card:hover .card-img-top { transform: scale(1.02); }
        `;
        document.head.appendChild(style);
    }

    addStyles();
    init();
    setInterval(loadEvents, 15 * 60 * 1000);
});