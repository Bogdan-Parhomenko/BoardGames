const API_BASE_URL = "https://localhost:7267/api";

let currentUser = null;
let currentChatId = null;
let chatRefreshInterval = null;
let currentProfileUserId = null;
let currentProfileData = null;

// ====== Список смайликов ======
const EMOJI_LIST = [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
    "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
    "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝",
    "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
    "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
    "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
    "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠",
    "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️",
    "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨",
    "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞",
    "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬",
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
    "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
    "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
    "🎮", "🎲", "🎯", "🎪", "🎭", "🃏", "🀄", "♠️",
    "♣️", "♥️", "♦️", "🏆", "🥇", "🥈", "🥉", "🎖️"
];

// ====== Вспомогательные функции UI ======

function showMessage(text, type = "info") {
    const box = document.getElementById("message");
    box.textContent = text;
    box.className = "message " + type;
    box.classList.remove("hidden");
    setTimeout(() => {
        box.classList.add("hidden");
    }, 4000);
}

function showSection(name) {
    const sections = ["auth", "events", "profile", "favorites", "chats"];
    sections.forEach((s) => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.classList.toggle("hidden", s !== name);
    });

    if (name === "chats") {
        // Сбрасываем текущий открытый чат
        currentChatId = null;
        currentChatData = null;

        // Очищаем область чата (правая панель)
        const chatArea = document.getElementById("chat-area");
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="chat-placeholder">
                    <div class="chat-placeholder-icon">💬</div>
                    <p>Выберите чат для начала общения</p>
                </div>
            `;
        }

        // Снимаем выделение с элементов списка чатов
        document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active"));

        loadChats();
        startChatRefresh();
    } else {
        stopChatRefresh();
    }
}

function updateNav() {
    const isLoggedIn = !!currentUser;
    document.getElementById("nav-auth").classList.toggle("hidden", isLoggedIn);
    document.getElementById("nav-events").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-chats").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-profile").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-favorites").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-logout").classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
        updateUserInfoHeader();
        showSection("events");
        loadProfile();
        loadEvents();
        loadFavorites();
        updateUnreadBadge();
    } else {
        updateUserInfoHeader();
        showSection("auth");
    }
}

function saveCurrentUser(user) {
    currentUser = user;
    localStorage.setItem("currentUser", JSON.stringify(user));
}

function loadCurrentUserFromStorage() {
    const data = localStorage.getItem("currentUser");
    if (data) {
        try {
            currentUser = JSON.parse(data);
        } catch {
            currentUser = null;
        }
    }
    updateNav();
}

function logout() {
    currentUser = null;
    currentChatId = null;
    localStorage.removeItem("currentUser");
    stopChatRefresh();

    const eventModal = document.getElementById("event-modal");
    if (eventModal) eventModal.classList.add("hidden");

    const favoriteModal = document.getElementById("favorite-modal");
    if (favoriteModal) favoriteModal.classList.add("hidden");

    const detailsModal = document.getElementById("event-details-modal");
    if (detailsModal) detailsModal.classList.add("hidden");

    showMessage("Вы вышли из системы", "info");
    updateNav();
}

// ====== Авторизация / регистрация ======

async function registerUser(event) {
    event.preventDefault();
    const login = document.getElementById("reg-login").value.trim();
    const fullName = document.getElementById("reg-fullname").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!login || !fullName || !password) {
        showMessage("Заполните все поля для регистрации", "error");
        return;
    }

    const body = { login, fullName, password };

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка регистрации: ${txt}`, "error");
            return;
        }

        const user = await resp.json();
        saveCurrentUser(user);
        updateNav();
        showMessage("Регистрация успешна. Вы вошли в систему.", "info");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при регистрации", "error");
    }
}

async function loginUser(event) {
    event.preventDefault();
    const login = document.getElementById("login-login").value.trim();
    const password = document.getElementById("login-password").value;

    if (!login || !password) {
        showMessage("Введите логин и пароль", "error");
        return;
    }

    const body = { login, password };

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка входа: ${txt}`, "error");
            return;
        }

        const user = await resp.json();
        saveCurrentUser(user);
        updateNav();
        showMessage("Вы успешно вошли в систему", "info");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при входе", "error");
    }
}

// ====== Профиль ======

async function loadProfile() {
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}`);
        if (!resp.ok) return;
        const profile = await resp.json();

        document.getElementById("profile-id").value = profile.userId;
        document.getElementById("profile-login-current").value = profile.login;
        document.getElementById("profile-fullname").value = profile.fullName ?? "";
        document.getElementById("profile-description").value = profile.description ?? "";
        document.getElementById("profile-phone").value = profile.phone ?? "";
        document.getElementById("profile-city").value = profile.city ?? "";
        document.getElementById("profile-photo").value = profile.photo ?? "";

        const preview = document.getElementById("profile-photo-preview");
        if (profile.photo) {
            preview.src = profile.photo;
        } else {
            preview.src = "img/user-placeholder.png";
        }

        currentUser.photo = profile.photo;
        currentUser.fullName = profile.fullName;
        saveCurrentUser(currentUser);
        updateUserInfoHeader(profile);

        // Загружаем отзывы о себе
        loadMyReviews();
    } catch (err) {
        console.error(err);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    if (!currentUser) return;

    const form = document.getElementById("profile-form");
    const phoneVal = document.getElementById("profile-phone").value.trim();
    const phonePattern = /^\+?[0-9\s\-()]{10,18}$/;

    if (phoneVal && !phonePattern.test(phoneVal)) {
        showMessage("Телефон должен быть в формате +7 900 000-00-00", "error");
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const body = {
        fullName: document.getElementById("profile-fullname").value.trim(),
        description: document.getElementById("profile-description").value.trim() || null,
        phone: phoneVal || null,
        city: document.getElementById("profile-city").value.trim() || null,
        photo: document.getElementById("profile-photo").value.trim() || null,
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка сохранения профиля: ${txt}`, "error");
            return;
        }

        currentUser.fullName = body.fullName;
        currentUser.phone = body.phone;
        currentUser.photo = body.photo;
        saveCurrentUser(currentUser);
        updateUserInfoHeader({ fullName: body.fullName, photo: body.photo });

        const preview = document.getElementById("profile-photo-preview");
        if (body.photo) {
            preview.src = body.photo;
        } else {
            preview.src = "img/user-placeholder.png";
        }

        showMessage("Профиль обновлён", "info");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при сохранении профиля", "error");
    }
}

async function changePassword(event) {
    event.preventDefault();
    if (!currentUser) return;

    const currentPassword = document.getElementById("profile-current-password").value;
    const newPassword = document.getElementById("profile-new-password").value;

    if (!currentPassword || !newPassword) {
        showMessage("Введите текущий и новый пароли", "error");
        return;
    }

    const body = { currentPassword, newPassword };

    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка смены пароля: ${txt}`, "error");
            return;
        }

        document.getElementById("profile-current-password").value = "";
        document.getElementById("profile-new-password").value = "";

        showMessage("Пароль успешно изменён", "info");

    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при смене пароля", "error");
    }
}

async function changeLogin(event) {
    event.preventDefault();
    if (!currentUser) return;

    const newLogin = document.getElementById("profile-login-new").value.trim();
    if (!newLogin) {
        showMessage("Введите новый логин", "error");
        return;
    }

    const body = { newLogin };

    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}/login`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка смены логина: ${txt}`, "error");
            return;
        }

        currentUser.login = newLogin;
        saveCurrentUser(currentUser);
        document.getElementById("profile-login-current").value = newLogin;
        document.getElementById("profile-login-new").value = "";

        showMessage("Логин успешно изменён", "info");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при смене логина", "error");
    }
}

async function uploadPhoto(auto = false) {
    if (!currentUser) return;
    const fileInput = document.getElementById("profile-photo-file");
    if (!fileInput.files || fileInput.files.length === 0) {
        if (!auto) {
            showMessage("Выберите файл для загрузки", "error");
        }
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}/photo`, {
            method: "POST",
            body: formData
        });

        if (!resp.ok) {
            const txt = await resp.text();
            if (!auto) {
                showMessage(`Ошибка загрузки фото: ${txt}`, "error");
            }
            return;
        }

        const photoUrl = await resp.text();

        document.getElementById("profile-photo").value = photoUrl;

        showMessage("Фото загружено. Нажмите «Сохранить профиль», чтобы применить.", "info");
    } catch (err) {
        console.error(err);
        if (!auto) {
            showMessage("Ошибка соединения при загрузке фото", "error");
        }
    }
}

async function handlePhotoFileChange(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) {
        return;
    }
    if (!currentUser) {
        showMessage("Сначала войдите в систему, затем загрузите фото", "error");
        input.value = "";
        return;
    }

    await uploadPhoto(true);
}

function updateUserInfoHeader(profile = null) {
    const box = document.getElementById("user-info");
    const img = document.getElementById("user-photo-small");
    const nameSpan = document.getElementById("user-name-small");

    if (!currentUser) {
        box.classList.add("hidden");
        return;
    }

    box.classList.remove("hidden");
    const name = profile?.fullName || currentUser.fullName || currentUser.login;
    nameSpan.textContent = name;

    const photo = profile?.photo || currentUser.photo;
    if (photo) {
        img.src = photo;
        img.classList.remove("hidden");
    } else {
        img.src = "";
        img.classList.add("hidden");
    }
}

async function deleteAccount() {
    if (!currentUser) return;
    if (!confirm("Вы уверены, что хотите удалить аккаунт? Все ваши события и записи будут удалены.")) {
        return;
    }
    try {
        const resp = await fetch(`${API_BASE_URL}/users/${currentUser.userId}`, {
            method: "DELETE"
        });
        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления аккаунта: ${txt}`, "error");
            return;
        }
        showMessage("Аккаунт удалён", "info");
        logout();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при удалении аккаунта", "error");
    }
}

// ====== События ======

async function loadEvents() {
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/events?userId=${currentUser.userId}`);
        if (!resp.ok) throw new Error("Ошибка загрузки событий");

        const events = await resp.json();
        const container = document.getElementById("events-list");
        container.innerHTML = "";

        if (!events || events.length === 0) {
            container.innerHTML = "<p>Событий пока нет.</p>";
            return;
        }

        events.forEach((ev) => {
            const card = document.createElement("div");
            card.className = "event-card";

            const date = ev.eventDate;
            const time = ev.eventTime ? ev.eventTime.substring(0, 5) : "";

            const statusText = ev.isCompleted ? "Событие завершено" : "Событие запланировано";

            const categoriesText = ev.categoryNames && ev.categoryNames.length
                ? ev.categoryNames.join(", ")
                : "не указаны";

            const durationText = ev.durationMinutes
                ? `${ev.durationMinutes} мин.`
                : "не указана";

            card.innerHTML = `
                <div class="event-title">${ev.title}</div>
                <div class="event-meta">
                    Дата: ${date} &nbsp; Время: ${time}<br/>
                    Адрес: ${ev.address}<br/>
                    Макс. игроков: ${ev.maxPlayers}<br/>
                    Статус: ${statusText}
                </div>
                <div class="event-meta">
                    Описание: ${ev.description ?? "—"}<br/>
                    Длительность: ${durationText}<br/>
                    Категории: ${categoriesText}
                </div>
                <div class="event-meta">
                    Организатор: ${ev.creatorName}
                </div>
                <div class="event-actions"></div>
            `;

            const actions = card.querySelector(".event-actions");

            if (!ev.isCompleted) {

                if (ev.isUserJoined) {
                    const leaveBtn = document.createElement("button");
                    leaveBtn.className = "btn";
                    leaveBtn.textContent = "Отменить запись";
                    leaveBtn.onclick = () => leaveEvent(ev.gameEventId);
                    actions.appendChild(leaveBtn);
                } else {
                    const joinBtn = document.createElement("button");
                    joinBtn.className = "btn primary";
                    joinBtn.textContent = "Записаться";
                    joinBtn.onclick = () => joinEvent(ev.gameEventId);
                    actions.appendChild(joinBtn);
                }

                if (ev.creatorId === currentUser.userId) {
                    const editBtn = document.createElement("button");
                    editBtn.className = "btn";
                    editBtn.textContent = "Редактировать";
                    editBtn.onclick = () => openEventForm(ev);
                    actions.appendChild(editBtn);
                }
            } else {
                const info = document.createElement("span");
                info.className = "event-meta";
                info.textContent = "Событие завершено. Запись и редактирование недоступны.";
                actions.appendChild(info);
            }

            // Кнопка чата события
            const chatBtn = document.createElement("button");
            chatBtn.className = "btn secondary";
            chatBtn.textContent = "💬 Чат";
            chatBtn.onclick = () => openEventChat(ev.gameEventId);
            actions.appendChild(chatBtn);

            const detailsBtn = document.createElement("button");
            detailsBtn.className = "btn";
            detailsBtn.textContent = "Подробнее";
            detailsBtn.onclick = () => openEventDetails(ev.gameEventId);
            actions.appendChild(detailsBtn);

            if (ev.creatorId === currentUser.userId) {
                const favBtn = document.createElement("button");
                favBtn.className = "btn secondary";
                favBtn.textContent = "В избранное";
                favBtn.onclick = () => createFavoriteFromEvent(ev.gameEventId);
                actions.appendChild(favBtn);

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "btn";
                deleteBtn.textContent = "Удалить";
                deleteBtn.onclick = () => deleteEvent(ev.gameEventId);
                actions.appendChild(deleteBtn);
            }

            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showMessage("Ошибка загрузки событий", "error");
    }
}

async function loadCategoriesForEventForm(selectedIds = []) {
    try {
        const resp = await fetch(`${API_BASE_URL}/categories`);
        if (!resp.ok) return;
        const cats = await resp.json();
        const sel = document.getElementById("event-categories");
        sel.innerHTML = "";

        const selectedSet = new Set(
            (selectedIds || []).map(id => parseInt(id, 10)).filter(n => !isNaN(n))
        );

        cats.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            if (selectedSet.has(c.id)) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
    }
}

function openEventForm(eventData = null) {
    const selectedIds = eventData && eventData.categoryIds ? eventData.categoryIds : [];
    loadCategoriesForEventForm();
    document.getElementById("event-modal").classList.remove("hidden");
    const titleEl = document.getElementById("event-modal-title");

    if (eventData) {
        titleEl.textContent = "Редактирование события";
        document.getElementById("event-id").value = eventData.gameEventId;
        document.getElementById("event-title").value = eventData.title;
        document.getElementById("event-description").value = eventData.description ?? "";
        document.getElementById("event-date").value = eventData.eventDate;
        document.getElementById("event-time").value = eventData.eventTime?.substring(0, 5) ?? "";
        document.getElementById("event-duration").value = eventData.durationMinutes ?? "";
        document.getElementById("event-address").value = eventData.address;
        document.getElementById("event-maxplayers").value = eventData.maxPlayers;
        document.getElementById("event-categoryids").value = "";
    } else {
        titleEl.textContent = "Создание события";
        document.getElementById("event-form").reset();
        document.getElementById("event-id").value = "";
    }
}

function closeEventForm() {
    document.getElementById("event-modal").classList.add("hidden");
}

async function submitEventForm(event) {
    event.preventDefault();
    if (!currentUser) return;

    const id = document.getElementById("event-id").value;
    const title = document.getElementById("event-title").value.trim();
    const description = document.getElementById("event-description").value.trim() || null;
    const eventDate = document.getElementById("event-date").value;
    let eventTime = document.getElementById("event-time").value;
    if (eventTime && eventTime.length === 5) eventTime += ":00";
    const durationStr = document.getElementById("event-duration").value;
    const durationMinutes = durationStr ? parseInt(durationStr, 10) : null;
    const address = document.getElementById("event-address").value.trim();
    const maxPlayers = parseInt(document.getElementById("event-maxplayers").value, 10);

    const catSelect = document.getElementById("event-categories");
    let categoryIds = Array.from(catSelect.selectedOptions)
        .map(o => parseInt(o.value, 10))
        .filter(n => !isNaN(n));

    if (categoryIds.length === 0) {
        categoryIds = null;
    }

    const body = {
        title,
        description,
        eventDate,
        eventTime,
        durationMinutes,
        address,
        maxPlayers,
        categoryIds,
    };

    let url = `${API_BASE_URL}/events`;
    let method = "POST";

    if (id) {
        url = `${API_BASE_URL}/events/${id}`;
        method = "PUT";
        delete body.creatorId;
    } else {
        body.creatorId = currentUser.userId;
    }

    try {
        const resp = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка сохранения события: ${txt}`, "error");
            return;
        }

        closeEventForm();
        showMessage("Событие сохранено", "info");
        loadEvents();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при сохранении события", "error");
    }
}

async function deleteEvent(id) {
    if (!confirm("Удалить это событие?")) return;
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/events/${id}?userId=${currentUser.userId}`, {
            method: "DELETE"
        });
        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления события: ${txt}`, "error");
            return;
        }
        showMessage("Событие удалено", "info");
        loadEvents();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при удалении события", "error");
    }
}

async function openEventDetails(eventId) {
    try {
        const resp = await fetch(`${API_BASE_URL}/events/${eventId}/details`);
        if (!resp.ok) {
            showMessage("Не удалось загрузить подробную информацию о событии", "error");
            return;
        }
        const ev = await resp.json();

        const modal = document.getElementById("event-details-modal");
        const titleEl = document.getElementById("event-details-title");
        const bodyEl = document.getElementById("event-details-body");

        titleEl.textContent = ev.title;

        const date = ev.eventDate;
        const time = ev.eventTime ? ev.eventTime.substring(0, 5) : "";
        const durationText = ev.durationMinutes ? `${ev.durationMinutes} мин.` : "не указана";
        const categoriesText = ev.categoryNames && ev.categoryNames.length
            ? ev.categoryNames.join(", ")
            : "не указаны";
        const statusText = ev.isCompleted ? "Завершено" : "Запланировано";
        const creatorPhoto = ev.creatorPhoto || "img/user-placeholder.png";

        let html = `
            <p><strong>Статус:</strong> ${statusText}</p>
            <p><strong>Дата и время:</strong> ${date} ${time}</p>
            <p><strong>Адрес:</strong> ${ev.address}</p>
            <p><strong>Длительность:</strong> ${durationText}</p>
            <p><strong>Категории:</strong> ${categoriesText}</p>
            <p><strong>Описание:</strong><br/>${ev.description ?? "—"}</p>
            <div class="event-organizer-block">
                <img class="event-organizer-avatar clickable-user" src="${creatorPhoto}" alt="${ev.creatorName}" 
                     onclick="openPublicProfile(${ev.creatorId})" title="Открыть профиль">
                <div class="event-organizer-info">
                    <div class="event-organizer-name clickable-user" onclick="openPublicProfile(${ev.creatorId})" title="Открыть профиль">${ev.creatorName}</div>
                    <div class="event-organizer-phone">
                        ${ev.creatorPhone || "Телефон не указан"}
                    </div>
                </div>
            </div>
        `;

        if (ev.participants && ev.participants.length > 0) {
            html += `<h4>Участники (${ev.participants.length}):</h4><div class="participant-list">`;
            ev.participants.forEach(p => {
                const photo = p.photo || "img/user-placeholder.png";
                const phoneText = p.phone || "Телефон не указан";
                const commentText = p.comment ? `Комментарий: ${p.comment}` : "Комментарий не указан";

                html += `
                    <div class="participant-item">
                        <img class="participant-avatar clickable-user" src="${photo}" alt="${p.fullName}" 
                             onclick="openPublicProfile(${p.userId})" title="Открыть профиль">
                        <div class="participant-info">
                            <div class="participant-name clickable-user" onclick="openPublicProfile(${p.userId})" title="Открыть профиль">${p.fullName}</div>
                            <div class="participant-phone">${phoneText}</div>
                            <div class="participant-comment">${commentText}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `<p><strong>Участники:</strong> пока никто не записался</p>`;
        }

        bodyEl.innerHTML = html;
        modal.classList.remove("hidden");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка загрузки подробностей события", "error");
    }
}

function closeEventDetails() {
    document.getElementById("event-details-modal").classList.add("hidden");
}

// ====== Участие в событии ======

async function joinEvent(eventId) {
    if (!currentUser) return;

    let comment = prompt("Оставьте комментарий организатору (необязательно):", "");
    if (comment) {
        comment = comment.trim();
    }
    const body = {
        userId: currentUser.userId,
        comment: comment || null,
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/events/${eventId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Не удалось записаться: ${txt}`, "error");
            return;
        }

        showMessage("Вы записались на событие", "info");
        loadEvents();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при записи на событие", "error");
    }
}

async function leaveEvent(eventId) {
    if (!currentUser) return;
    try {
        const url = `${API_BASE_URL}/events/${eventId}/join?userId=${currentUser.userId}`;
        const resp = await fetch(url, { method: "DELETE" });
        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Не удалось отменить запись: ${txt}`, "error");
            return;
        }
        showMessage("Запись на событие отменена", "info");
        loadEvents();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при отмене записи", "error");
    }
}

// ====== Избранные события (шаблоны) ======

function openFavoriteForm() {
    document.getElementById("favorite-modal").classList.remove("hidden");
    document.getElementById("favorite-form").reset();
}

function closeFavoriteForm() {
    document.getElementById("favorite-modal").classList.add("hidden");
}

async function submitFavoriteForm(event) {
    event.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById("fav-title").value.trim();
    const description = document.getElementById("fav-description").value.trim() || null;
    const address = document.getElementById("fav-address").value.trim();

    const body = {
        creatorId: currentUser.userId,
        title,
        description,
        address,
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/favorites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка создания шаблона: ${txt}`, "error");
            return;
        }

        closeFavoriteForm();
        showMessage("Шаблон добавлен в избранное", "info");
        loadFavorites();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при создании шаблона", "error");
    }
}

async function loadFavorites() {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/user/${currentUser.userId}`);
        if (!resp.ok) throw new Error("Ошибка загрузки избранных");

        const favorites = await resp.json();
        const container = document.getElementById("favorites-list");
        container.innerHTML = "";

        if (!favorites || favorites.length === 0) {
            container.innerHTML = "<p>Избранных событий пока нет.</p>";
            return;
        }

        favorites.forEach((fav) => {
            const card = document.createElement("div");
            card.className = "event-card";
            card.innerHTML = `
                <div class="event-title">${fav.title}</div>
                <div class="event-meta">
                    Адрес: ${fav.address}<br/>
                    Описание: ${fav.description ?? ""}
                </div>
                <div class="event-actions"></div>
            `;
            const actions = card.querySelector(".event-actions");

            const delBtn = document.createElement("button");
            delBtn.className = "btn";
            delBtn.textContent = "Удалить из избранного";
            delBtn.onclick = () => deleteFavorite(fav.favoriteEventId);
            actions.appendChild(delBtn);

            const createFromTemplateBtn = document.createElement("button");
            createFromTemplateBtn.className = "btn secondary";
            createFromTemplateBtn.textContent = "Создать событие";
            createFromTemplateBtn.onclick = () => {
                openEventForm({
                    gameEventId: null,
                    title: fav.title,
                    description: fav.description,
                    eventDate: new Date().toISOString().substring(0, 10),
                    eventTime: "18:00:00",
                    durationMinutes: null,
                    address: fav.address,
                    maxPlayers: 4
                });
            };
            actions.appendChild(createFromTemplateBtn);

            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showMessage("Ошибка загрузки избранных событий", "error");
    }
}

async function deleteFavorite(favoriteId) {
    if (!confirm("Удалить этот шаблон из избранного?")) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/${favoriteId}`, {
            method: "DELETE",
        });
        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления шаблона: ${txt}`, "error");
            return;
        }
        showMessage("Шаблон удалён из избранного", "info");
        loadFavorites();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при удалении шаблона", "error");
    }
}

async function createFavoriteFromEvent(eventId) {
    if (!currentUser) return;

    const body = { creatorId: currentUser.userId, gameEventId: eventId };

    try {
        const resp = await fetch(`${API_BASE_URL}/favorites/from-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Не удалось добавить событие в избранное: ${txt}`, "error");
            return;
        }

        showMessage("Событие сохранено как шаблон избранного", "info");
        loadFavorites();
    } catch (err) {
        console.error(err);
        showMessage("Ошибка соединения при добавлении в избранное", "error");
    }
}

// ====== ЧАТЫ ======

let currentChatData = null; // Добавляем переменную для хранения данных текущего чата

async function loadChats() {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/user/${currentUser.userId}`);
        if (!resp.ok) throw new Error("Ошибка загрузки чатов");

        const chats = await resp.json();
        const container = document.getElementById("chats-list");

        if (!chats || chats.length === 0) {
            container.innerHTML = '<p class="chats-empty">У вас пока нет сообщений</p>';
            return;
        }

        container.innerHTML = "";

        chats.forEach(chat => {
            const item = document.createElement("div");
            item.className = "chat-item" + (currentChatId === chat.chatId ? " active" : "");
            item.onclick = () => openChat(chat.chatId);

            const photo = chat.chatPhoto || "img/user-placeholder.png";
            const lastMsg = chat.lastMessage;
            const previewText = lastMsg
                ? (lastMsg.isOwn ? "Вы: " : "") + truncateText(lastMsg.content, 30)
                : "Нет сообщений";
            const timeText = lastMsg ? formatChatTime(lastMsg.sentAt) : "";

            item.innerHTML = `
                <img class="chat-item-avatar" src="${photo}" alt="${chat.chatName}">
                <div class="chat-item-info">
                    <div class="chat-item-header">
                        <span class="chat-item-name">
                            ${chat.chatName}
                            ${chat.chatType === 'event' ? '<span class="chat-item-event-badge">событие</span>' : ''}
                        </span>
                        <span class="chat-item-time">${timeText}</span>
                    </div>
                    <div class="chat-item-preview">${previewText}</div>
                </div>
                ${chat.unreadCount > 0 ? `<span class="chat-item-badge">${chat.unreadCount}</span>` : ''}
            `;

            container.appendChild(item);
        });

        updateUnreadBadge();
    } catch (err) {
        console.error(err);
        document.getElementById("chats-list").innerHTML = '<p class="chats-empty">Ошибка загрузки</p>';
    }
}

async function openChat(chatId, forceFullRender = false) {
    if (!currentUser) return;

    const isNewChat = currentChatId !== chatId;
    currentChatId = chatId;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/${chatId}/messages?userId=${currentUser.userId}`);
        if (!resp.ok) throw new Error("Ошибка загрузки сообщений");

        const data = await resp.json();
        currentChatData = data.chat;

        if (isNewChat || forceFullRender) {
            // Полная перерисовка только при открытии нового чата
            renderChatArea(data.chat, data.messages);
        } else {
            // Обновляем только сообщения, сохраняя поле ввода
            updateMessagesOnly(data.messages);
        }

        // Обновить список чатов (для badge)
        loadChats();

    } catch (err) {
        console.error(err);
        showMessage("Ошибка загрузки чата", "error");
    }
}

function renderChatArea(chat, messages) {
    const area = document.getElementById("chat-area");
    const photo = chat.chatPhoto || "img/user-placeholder.png";
    const participantsText = chat.chatType === 'event'
        ? `${chat.participants.length} участников`
        : "Личный чат";

    // Для личного чата делаем шапку кликабельной
    const isPrivateChat = chat.chatType === 'private';
    let otherUserId = null;

    if (isPrivateChat && currentUser) {
        const otherParticipant = chat.participants.find(p => p.userId !== currentUser.userId);
        if (otherParticipant) {
            otherUserId = otherParticipant.userId;
        }
    }

    const clickableClass = isPrivateChat && otherUserId ? 'clickable' : '';
    const onClickAvatar = isPrivateChat && otherUserId ? `onclick="openProfileFromChat(${otherUserId})"` : '';
    const onClickName = isPrivateChat && otherUserId ? `onclick="openProfileFromChat(${otherUserId})"` : '';

    area.innerHTML = `
        <div class="chat-header">
            <button class="chat-header-back" onclick="closeChatArea()">←</button>
            <img class="chat-header-avatar ${clickableClass}" src="${photo}" alt="${chat.chatName}" ${onClickAvatar} title="${isPrivateChat ? 'Открыть профиль' : ''}">
            <div class="chat-header-info">
                <div class="chat-header-name ${clickableClass}" ${onClickName} title="${isPrivateChat ? 'Открыть профиль' : ''}">${chat.chatName}</div>
                <div class="chat-header-status">${participantsText}</div>
            </div>
            <div class="chat-header-actions">
                <button class="btn" onclick="deleteChat(${chat.chatId})">Удалить чат</button>
            </div>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-area">
            <form class="chat-input-form" onsubmit="sendMessage(event)">
                <div class="chat-input-wrapper">
                    <button type="button" class="emoji-btn" onclick="toggleEmojiPicker(event)">😊</button>
                    <textarea class="chat-input" id="chat-input" placeholder="Введите сообщение..." rows="1" onkeydown="handleChatInputKeydown(event)"></textarea>
                </div>
                <button type="submit" class="chat-send-btn">➤</button>
            </form>
        </div>
    `;

    renderMessages(messages);
    scrollToBottom();
}

function openProfileFromChat(userId) {
    if (!userId) return;
    openPublicProfile(userId);
}

function updateMessagesOnly(messages) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    // Проверяем, нужно ли обновлять (сравниваем количество сообщений)
    const currentMessageCount = container.querySelectorAll(".message-item").length;
    const newMessageCount = messages.length;

    // Если количество сообщений изменилось, обновляем
    if (currentMessageCount !== newMessageCount) {
        const wasAtBottom = isScrolledToBottom(container);
        renderMessages(messages);

        // Прокручиваем вниз только если пользователь был внизу
        if (wasAtBottom) {
            scrollToBottom();
        }
    }
}

// Проверка, находится ли скролл внизу
function isScrolledToBottom(container) {
    const threshold = 50; // небольшой допуск в пикселях
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

function renderMessages(messages) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    container.innerHTML = "";

    let lastDate = null;

    messages.forEach(msg => {
        const msgDate = new Date(msg.sentAt).toLocaleDateString("ru-RU");

        if (msgDate !== lastDate) {
            const divider = document.createElement("div");
            divider.className = "messages-date-divider";
            divider.innerHTML = `<span>${formatMessageDate(msg.sentAt)}</span>`;
            container.appendChild(divider);
            lastDate = msgDate;
        }

        const item = document.createElement("div");
        item.className = "message-item" + (msg.isOwn ? " own" : "");
        item.dataset.messageId = msg.messageId; // Добавляем id для сравнения

        const photo = msg.senderPhoto || "img/user-placeholder.png";
        const time = formatMessageTime(msg.sentAt);

        item.innerHTML = `
            <img class="message-avatar" src="${photo}" alt="${msg.senderName}">
            <div class="message-bubble">
                <div class="message-sender">${msg.senderName}</div>
                <div class="message-content ${msg.isDeleted ? 'message-deleted' : ''}">${msg.isDeleted ? msg.content : escapeHtml(msg.content)}</div>
                <div class="message-footer">
                    <span class="message-time">${time}</span>
                    ${msg.isOwn && !msg.isDeleted ? `<button class="message-delete-btn" onclick="deleteMessage(${msg.messageId})">удалить</button>` : ''}
                </div>
            </div>
        `;

        container.appendChild(item);
    });
}

function scrollToBottom() {
    const container = document.getElementById("chat-messages");
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage(event) {
    event.preventDefault();
    if (!currentUser || !currentChatId) return;

    const input = document.getElementById("chat-input");
    const content = input.value.trim();

    if (!content) return;

    // Сохраняем и очищаем ввод сразу для лучшего UX
    const messageText = content;
    input.value = "";

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/${currentChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId: currentUser.userId,
                content: messageText
            })
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка отправки: ${txt}`, "error");
            // Восстанавливаем текст при ошибке
            input.value = messageText;
            return;
        }

        // Обновляем только сообщения
        openChat(currentChatId);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка отправки сообщения", "error");
        // Восстанавливаем текст при ошибке
        input.value = messageText;
    }
}

async function deleteMessage(messageId) {
    if (!currentUser) return;
    if (!confirm("Удалить это сообщение?")) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/messages/${messageId}?userId=${currentUser.userId}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления: ${txt}`, "error");
            return;
        }

        // Обновляем только сообщения
        openChat(currentChatId);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка удаления сообщения", "error");
    }
}

async function deleteChat(chatId) {
    if (!currentUser) return;
    if (!confirm("Удалить этот чат у себя?")) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/${chatId}?userId=${currentUser.userId}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления чата: ${txt}`, "error");
            return;
        }

        currentChatId = null;
        currentChatData = null;
        document.getElementById("chat-area").innerHTML = `
            <div class="chat-placeholder">
                <div class="chat-placeholder-icon">💬</div>
                <p>Выберите чат для начала общения</p>
            </div>
        `;
        loadChats();
        showMessage("Чат удалён", "info");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка удаления чата", "error");
    }
}

function closeChatArea() {
    currentChatId = null;
    currentChatData = null;
    document.getElementById("chat-area").innerHTML = `
        <div class="chat-placeholder">
            <div class="chat-placeholder-icon">💬</div>
            <p>Выберите чат для начала общения</p>
        </div>
    `;
    document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active"));
}

// Начать личный чат
async function startPrivateChat(otherUserId) {
    if (!currentUser) return;

    // Преобразуем в число
    otherUserId = parseInt(otherUserId, 10);

    if (isNaN(otherUserId)) {
        showMessage("Ошибка: некорректный ID пользователя", "error");
        return;
    }

    if (otherUserId === currentUser.userId) {
        showMessage("Вы не можете написать самому себе", "error");
        return;
    }

    // Закрыть модалки
    closeEventDetails();
    closePublicProfile();

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/private`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.userId,
                otherUserId: otherUserId
            })
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка создания чата: ${txt}`, "error");
            return;
        }

        const chat = await resp.json();
        showSection("chats");
        setTimeout(() => openChat(chat.chatId, true), 100);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка создания чата", "error");
    }
}

// Открыть чат события
async function openEventChat(eventId) {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: currentUser.userId,
                eventId: eventId
            })
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка открытия чата события: ${txt}`, "error");
            return;
        }

        const chat = await resp.json();
        showSection("chats");
        setTimeout(() => openChat(chat.chatId), 100);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка открытия чата события", "error");
    }
}

// ====== Emoji Picker ======

function initEmojiPicker() {
    const grid = document.getElementById("emoji-grid");
    if (!grid) return;

    grid.innerHTML = "";
    EMOJI_LIST.forEach(emoji => {
        const item = document.createElement("span");
        item.className = "emoji-item";
        item.textContent = emoji;
        item.onclick = () => insertEmoji(emoji);
        grid.appendChild(item);
    });
}

function toggleEmojiPicker(event) {
    event.preventDefault();
    const picker = document.getElementById("emoji-picker");

    if (picker.classList.contains("hidden")) {
        // Позиционируем пикер
        const btn = event.target;
        const rect = btn.getBoundingClientRect();
        picker.style.left = rect.left + "px";
        picker.style.bottom = (window.innerHeight - rect.top + 10) + "px";
        picker.classList.remove("hidden");
        initEmojiPicker();
    } else {
        picker.classList.add("hidden");
    }
}

function closeEmojiPicker() {
    document.getElementById("emoji-picker").classList.add("hidden");
}

function insertEmoji(emoji) {
    const input = document.getElementById("chat-input");
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
    }
    closeEmojiPicker();
}

// Обработка Enter для отправки
function handleChatInputKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage(event);
    }
}

// ====== Вспомогательные функции ======

function truncateText(text, maxLen) {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + "...";
}

function formatChatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } else if (diff < 7 * oneDay) {
        return date.toLocaleDateString("ru-RU", { weekday: "short" });
    } else {
        return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    }
}

function formatMessageTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatMessageDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && date.getDate() === now.getDate()) {
        return "Сегодня";
    } else if (diff < 2 * oneDay && date.getDate() === now.getDate() - 1) {
        return "Вчера";
    } else {
        return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function updateUnreadBadge() {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/user/${currentUser.userId}`);
        if (!resp.ok) return;

        const chats = await resp.json();
        const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

        const badge = document.getElementById("nav-chats-badge");
        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? "99+" : totalUnread;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
    }
}

function startChatRefresh() {
    stopChatRefresh();
    chatRefreshInterval = setInterval(() => {
        if (currentChatId) {
            // Передаём false, чтобы не делать полную перерисовку
            refreshCurrentChat();
        } else {
            loadChats();
        }
    }, 5000);
}

async function refreshCurrentChat() {
    if (!currentUser || !currentChatId) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/chats/${currentChatId}/messages?userId=${currentUser.userId}`);
        if (!resp.ok) return;

        const data = await resp.json();
        updateMessagesOnly(data.messages);
        loadChats(); // обновляем список чатов для badge
    } catch (err) {
        console.error("Ошибка обновления чата:", err);
    }
}

function stopChatRefresh() {
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
        chatRefreshInterval = null;
    }
}

// ====== Инициализация ======

document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUserFromStorage();

    const fileInput = document.getElementById("profile-photo-file");
    if (fileInput) {
        fileInput.addEventListener("change", handlePhotoFileChange);
    }

    // Закрывать emoji picker при клике вне его
    document.addEventListener("click", (e) => {
        const picker = document.getElementById("emoji-picker");
        const emojiBtn = e.target.closest(".emoji-btn");
        if (!picker.contains(e.target) && !emojiBtn) {
            picker.classList.add("hidden");
        }
    });

    // Периодическое обновление badge непрочитанных
    setInterval(updateUnreadBadge, 30000);
});

async function openPublicProfile(userId) {
    if (!userId) return;

    // Преобразуем в число
    userId = parseInt(userId, 10);
    if (isNaN(userId)) return;

    // Если это свой профиль, открываем личный
    if (currentUser && userId === currentUser.userId) {
        closeEventDetails();
        showSection('profile');
        return;
    }

    currentProfileUserId = userId;

    try {
        const url = currentUser
            ? `${API_BASE_URL}/reviews/profile/${userId}?currentUserId=${currentUser.userId}`
            : `${API_BASE_URL}/reviews/profile/${userId}`;

        const resp = await fetch(url);
        if (!resp.ok) {
            showMessage("Не удалось загрузить профиль", "error");
            return;
        }

        const profile = await resp.json();
        currentProfileData = profile;
        renderPublicProfile(profile);
        document.getElementById("public-profile-modal").classList.remove("hidden");
    } catch (err) {
        console.error(err);
        showMessage("Ошибка загрузки профиля", "error");
    }
}


function renderPublicProfile(profile) {
    // Основная информация
    document.getElementById("public-profile-photo").src = profile.photo || "img/user-placeholder.png";
    document.getElementById("public-profile-name").textContent = profile.fullName;

    const cityEl = document.getElementById("public-profile-city");
    if (profile.city) {
        cityEl.textContent = profile.city;
        cityEl.style.display = "block";
    } else {
        cityEl.style.display = "none";
    }

    document.getElementById("public-profile-description").textContent = profile.description || "Не указано";
    document.getElementById("public-profile-phone").textContent = profile.phone || "Не указан";

    // Кнопка сообщения
    const msgBtn = document.getElementById("public-profile-message-btn");
    if (currentUser && currentUser.userId !== profile.userId) {
        msgBtn.style.display = "inline-block";
    } else {
        msgBtn.style.display = "none";
    }

    // Статистика
    document.getElementById("stat-positive").textContent = profile.positiveCount;
    document.getElementById("stat-neutral").textContent = profile.neutralCount;
    document.getElementById("stat-negative").textContent = profile.negativeCount;
    document.getElementById("reviews-count").textContent = profile.totalReviews > 0 ? `(${profile.totalReviews})` : "";

    // Форма отзыва
    const formSection = document.getElementById("review-form-section");
    const formTitle = document.getElementById("review-form-title");
    const submitBtn = document.getElementById("review-submit-btn");
    const editBtn = document.getElementById("review-edit-btn");
    const deleteBtn = document.getElementById("review-delete-btn");
    const cancelBtn = document.getElementById("review-cancel-btn");

    // Очищаем форму по умолчанию
    clearReviewForm();

    if (currentUser && currentUser.userId !== profile.userId) {
        formSection.classList.remove("hidden");

        if (profile.myReview) {
            // У пользователя есть отзыв - показываем кнопку редактирования
            formTitle.textContent = "Ваш отзыв";
            submitBtn.textContent = "Сохранить изменения";
            submitBtn.style.display = "none";
            editBtn.style.display = "inline-block";
            deleteBtn.style.display = "inline-block";
            cancelBtn.style.display = "none";

            // Сохраняем данные для редактирования
            document.getElementById("review-id").value = profile.myReview.reviewId;
        } else if (profile.canReview) {
            // Новый отзыв
            formTitle.textContent = "Оставить отзыв";
            submitBtn.textContent = "Отправить отзыв";
            submitBtn.style.display = "inline-block";
            editBtn.style.display = "none";
            deleteBtn.style.display = "none";
            cancelBtn.style.display = "none";
        } else {
            formSection.classList.add("hidden");
        }
    } else {
        formSection.classList.add("hidden");
    }

    // Список отзывов
    renderReviews(profile.reviews);
}

function fillReviewForm() {
    if (!currentProfileData || !currentProfileData.myReview) return;

    const review = currentProfileData.myReview;

    document.getElementById("review-id").value = review.reviewId;
    document.getElementById("review-comment").value = review.comment;

    // Выбираем рейтинг
    const form = document.getElementById("review-form");
    const ratingInput = form.querySelector(`input[value="${review.rating}"]`);
    if (ratingInput) ratingInput.checked = true;

    // Показываем кнопки
    document.getElementById("review-submit-btn").style.display = "inline-block";
    document.getElementById("review-submit-btn").textContent = "Сохранить изменения";
    document.getElementById("review-edit-btn").style.display = "none";
    document.getElementById("review-cancel-btn").style.display = "inline-block";

    // Фокус на комментарий
    document.getElementById("review-comment").focus();
}

function clearReviewForm() {
    const form = document.getElementById("review-form");
    form.reset();
    document.getElementById("review-id").value = "";
    document.getElementById("review-comment").value = "";

    // Сбрасываем кнопки к состоянию по умолчанию
    if (currentProfileData && currentProfileData.myReview) {
        document.getElementById("review-submit-btn").style.display = "none";
        document.getElementById("review-edit-btn").style.display = "inline-block";
        document.getElementById("review-cancel-btn").style.display = "none";
        document.getElementById("review-id").value = currentProfileData.myReview.reviewId;
    } else {
        document.getElementById("review-submit-btn").style.display = "inline-block";
        document.getElementById("review-submit-btn").textContent = "Отправить отзыв";
        document.getElementById("review-cancel-btn").style.display = "none";
    }
}

function renderReviews(reviews) {
    const container = document.getElementById("reviews-list");

    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="reviews-empty">Пока нет отзывов</p>';
        return;
    }

    container.innerHTML = "";

    reviews.forEach(review => {
        const item = document.createElement("div");
        item.className = "review-item";

        const photo = review.reviewerPhoto || "img/user-placeholder.png";
        const ratingEmoji = getRatingEmoji(review.rating);
        const date = formatReviewDate(review.createdAt);

        item.innerHTML = `
            <img class="review-avatar clickable-user" src="${photo}" alt="${review.reviewerName}" 
                 onclick="openPublicProfile(${review.reviewerId})">
            <div class="review-content">
                <div class="review-header">
                    <span class="review-author" onclick="openPublicProfile(${review.reviewerId})">${review.reviewerName}</span>
                </div>
                <div class="review-rating-line">
                    <span class="review-rating-label">Оценка:</span>
                    <span class="review-rating-emoji">${ratingEmoji}</span>
                </div>
                <p class="review-text">${escapeHtml(review.comment)}</p>
                <div class="review-footer">
                    <span class="review-date">${date}</span>
                    ${review.isOwn ? `
                        <div class="review-actions">
                            <button class="btn" onclick="fillReviewForm()">Редактировать</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        container.appendChild(item);
    });
}

function getRatingEmoji(rating) {
    switch (rating) {
        case 'positive': return '😊';
        case 'neutral': return '😐';
        case 'negative': return '😠';
        default: return '😐';
    }
}

function formatReviewDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function closePublicProfile() {
    document.getElementById("public-profile-modal").classList.add("hidden");
    currentProfileUserId = null;
    currentProfileData = null;
}

function messageFromProfile() {
    if (!currentUser || !currentProfileUserId) return;

    const userId = parseInt(currentProfileUserId, 10);
    if (isNaN(userId)) {
        showMessage("Ошибка: некорректный ID пользователя", "error");
        return;
    }

    closePublicProfile();
    startPrivateChat(userId);
}

async function submitReview(event) {
    event.preventDefault();
    if (!currentUser || !currentProfileUserId) return;

    const reviewId = document.getElementById("review-id").value;
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById("review-comment").value.trim();

    if (!ratingInput) {
        showMessage("Выберите оценку", "error");
        return;
    }

    if (!comment) {
        showMessage("Напишите комментарий", "error");
        return;
    }

    const rating = ratingInput.value;

    try {
        let resp;

        if (reviewId && currentProfileData && currentProfileData.myReview) {
            // Обновление
            resp = await fetch(`${API_BASE_URL}/reviews/${reviewId}?userId=${currentUser.userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment })
            });
        } else {
            // Создание
            resp = await fetch(`${API_BASE_URL}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reviewerId: currentUser.userId,
                    targetUserId: parseInt(currentProfileUserId, 10),
                    rating,
                    comment
                })
            });
        }

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка: ${txt}`, "error");
            return;
        }

        showMessage(reviewId && currentProfileData?.myReview ? "Отзыв обновлён" : "Отзыв добавлен", "info");

        // Перезагружаем профиль
        openPublicProfile(currentProfileUserId);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка сохранения отзыва", "error");
    }
}

async function deleteMyReview() {
    if (!currentUser) return;

    const reviewId = document.getElementById("review-id").value;
    if (!reviewId) return;

    if (!confirm("Удалить ваш отзыв?")) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/reviews/${reviewId}?userId=${currentUser.userId}`, {
            method: "DELETE"
        });

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка удаления: ${txt}`, "error");
            return;
        }

        showMessage("Отзыв удалён", "info");
        openPublicProfile(currentProfileUserId);
    } catch (err) {
        console.error(err);
        showMessage("Ошибка удаления отзыва", "error");
    }
}

async function loadMyReviews() {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/reviews/profile/${currentUser.userId}?currentUserId=${currentUser.userId}`);
        if (!resp.ok) return;

        const profile = await resp.json();

        // Статистика
        document.getElementById("my-stat-positive").textContent = profile.positiveCount;
        document.getElementById("my-stat-neutral").textContent = profile.neutralCount;
        document.getElementById("my-stat-negative").textContent = profile.negativeCount;

        // Отзывы
        const container = document.getElementById("my-reviews-list");

        if (!profile.reviews || profile.reviews.length === 0) {
            container.innerHTML = '<p class="reviews-empty">У вас пока нет отзывов</p>';
            return;
        }

        container.innerHTML = "";

        profile.reviews.forEach(review => {
            const item = document.createElement("div");
            item.className = "review-item";

            const photo = review.reviewerPhoto || "img/user-placeholder.png";
            const ratingEmoji = getRatingEmoji(review.rating);
            const date = formatReviewDate(review.createdAt);

            item.innerHTML = `
                <img class="review-avatar clickable-user" src="${photo}" alt="${review.reviewerName}" 
                     onclick="openPublicProfile(${review.reviewerId})">
                <div class="review-content">
                    <div class="review-header">
                        <span class="review-author" onclick="openPublicProfile(${review.reviewerId})">${review.reviewerName}</span>
                    </div>
                    <div class="review-rating-line">
                        <span class="review-rating-label">Оценка:</span>
                        <span class="review-rating-emoji">${ratingEmoji}</span>
                    </div>
                    <p class="review-text">${escapeHtml(review.comment)}</p>
                    <div class="review-footer">
                        <span class="review-date">${date}</span>
                    </div>
                </div>
            `;

            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
    }
}

function editMyReview(reviewId) {
    // Прокручиваем к форме и фокусируемся
    const formSection = document.getElementById("review-form-section");
    formSection.scrollIntoView({ behavior: 'smooth' });
    document.getElementById("review-comment").focus();
}