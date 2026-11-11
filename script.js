// === 1. Глобальные переменные ===
const API_BASE = 'https://jsonplaceholder.typicode.com';
let allAlbums = []; // Храним все альбомы для фильтрации

// Элементы DOM
const searchInput = document.getElementById('searchInput');
const albumSelect = document.getElementById('albumSelect');
const errorMessage = document.getElementById('errorMessage');
const authorInfo = document.getElementById('authorInfo');
const photosContainer = document.getElementById('photosContainer');

// Элементы для вывода данных автора
const authorName = document.getElementById('authorName');
const authorUsername = document.getElementById('authorUsername');
const authorEmail = document.getElementById('authorEmail');
const photoCountText = document.getElementById('photoCountText');

// === 2. Вспомогательные функции ===
function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showLoading(isLoading) {
    if (isLoading) {
        albumSelect.innerHTML = '<option value="">Загрузка...</option>';
        albumSelect.disabled = true;
    } else {
        albumSelect.disabled = false;
    }
}

function clearContent() {
    authorInfo.style.display = 'none';
    photosContainer.style.display = 'none';
    photosContainer.innerHTML = '';
}

// === 3. Загрузка списка альбомов ===
async function loadAlbums() {
    hideError();
    showLoading(true);
    clearContent();

    try {
        const response = await fetch(`${API_BASE}/albums`);
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        allAlbums = await response.json();
        
        // Сортируем по ID для красоты
        allAlbums.sort((a, b) => a.id - b.id);
        
        renderAlbumOptions(allAlbums);

        // Восстановление из localStorage (Задание 8 - доп)
        const savedAlbumId = localStorage.getItem('selectedAlbumId');
        if (savedAlbumId && allAlbums.some(a => a.id === parseInt(savedAlbumId))) {
            albumSelect.value = savedAlbumId;
            handleAlbumChange(savedAlbumId);
        }

    } catch (error) {
        showLoading(false);
        albumSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        showError(`Не удалось загрузить альбомы: ${error.message}`);
    }
}

// === 4. Отрисовка выпадающего списка ===
function renderAlbumOptions(albums) {
    albumSelect.innerHTML = '<option value="">Выберите альбом...</option>';
    
    if (albums.length === 0) {
        albumSelect.innerHTML = '<option value="">Альбомы не найдены</option>';
        return;
    }

    albums.forEach(album => {
        const option = document.createElement('option');
        option.value = album.id;
        // Добавляем нумерацию (ID) перед названием
        option.textContent = `${album.id}. ${album.title}`; 
        albumSelect.appendChild(option);
    });
    
    showLoading(false);
}

// === 5. Обработка выбора альбома (Promise.all) ===
async function handleAlbumChange(albumId) {
    if (!albumId) {
        clearContent();
        localStorage.removeItem('selectedAlbumId');
        return;
    }

    hideError();
    clearContent();
    
    // Показываем загрузку прямо в блоке автора (чтобы не было пустоты)
    authorInfo.style.display = 'block';
    authorName.textContent = 'Загрузка данных...';
    authorUsername.textContent = '';
    authorEmail.textContent = '';
    photoCountText.textContent = '';

    try {
        // Находим выбранный альбом в локальном массиве, чтобы взять userId
        const album = allAlbums.find(a => a.id === parseInt(albumId));
        if (!album) throw new Error('Альбом не найден');

        // Задание 4. Параллельные запросы через Promise.all
        const [userResponse, photosResponse] = await Promise.all([
            fetch(`${API_BASE}/users/${album.userId}`),
            fetch(`${API_BASE}/photos?albumId=${album.id}`)
        ]);

        // Проверка response.ok для обоих запросов
        if (!userResponse.ok || !photosResponse.ok) {
            throw new Error('Ошибка загрузки данных с сервера');
        }

        const user = await userResponse.json();
        const photos = await photosResponse.json();

        // Сохраняем выбор (Задание 8 - доп)
        localStorage.setItem('selectedAlbumId', albumId);

        // Задание 2, 7. Рендер автора + счетчик
        authorName.textContent = user.name;
        authorUsername.textContent = user.username;
        authorEmail.textContent = user.email;
        photoCountText.textContent = `Автор: ${user.name} — ${photos.length} фотографий`;
        
        // Рендер фото
        renderPhotos(photos);

    } catch (error) {
        clearContent();
        showError(`Не удалось загрузить данные альбома: ${error.message}`);
    }
}

// === 6. Отрисовка фотографий (Задание 3, 6) ===
function renderPhotos(photos) {
    photosContainer.innerHTML = '';
    
    if (photos.length === 0) {
        photosContainer.innerHTML = '<p>В этом альбоме нет фотографий.</p>';
        photosContainer.style.display = 'block';
        return;
    }

    const fragment = document.createDocumentFragment();

    photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'photo-card';

        // Ссылка на полноразмерное фото с target="_blank" и rel="noopener noreferrer"
        const link = document.createElement('a');
        link.href = photo.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const img = document.createElement('img');
        img.src = photo.thumbnailUrl;
        img.alt = photo.title;
        img.loading = 'lazy'; // Для оптимизации

        link.appendChild(img);

        const title = document.createElement('div');
        title.className = 'photo-title';
        title.textContent = photo.title;
        title.title = photo.title; // Показываем полный текст при наведении

        card.appendChild(link);
        card.appendChild(title);
        fragment.appendChild(card);
    });

    photosContainer.appendChild(fragment);
    photosContainer.style.display = 'grid';
}

// === 7. Фильтрация списка (Задание 8 - доп) ===
function filterAlbums() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allAlbums.filter(album => 
        album.title.toLowerCase().includes(query)
    );
    renderAlbumOptions(filtered);
    
    // Если выбранный альбом не входит в фильтр — очищаем данные
    if (albumSelect.value && !filtered.some(a => a.id === parseInt(albumSelect.value))) {
        albumSelect.value = '';
        clearContent();
        localStorage.removeItem('selectedAlbumId');
    }
}

// === 8. Инициализация и слушатели событий ===
albumSelect.addEventListener('change', (e) => {
    handleAlbumChange(e.target.value);
});

searchInput.addEventListener('input', filterAlbums);

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', loadAlbums);