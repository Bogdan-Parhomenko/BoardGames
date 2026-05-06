const API_BASE_URL = "/api";

const VK_APP_ID = 54576394;
const VK_REDIRECT_URL = `https://rugjs1ntaf.localto.net/index.html`;

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

function isAdmin() {
    return currentUser && currentUser.role === "admin";
}

function showSection(name) {
    const sections = ["auth", "events", "profile", "favorites", "chats", "notifications", "admin"];
    sections.forEach((s) => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.classList.toggle("hidden", s !== name);
    });

    if (name === "chats") {
        currentChatId = null;
        currentChatData = null;
        const chatArea = document.getElementById("chat-area");
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="chat-placeholder">
                    <div class="chat-placeholder-icon">💬</div>
                    <p>Выберите чат для начала общения</p>
                </div>
            `;
        }
        document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active"));
        loadChats();
        startChatRefresh();
    } else {
        stopChatRefresh();
    }

    if (name === "notifications") loadNotifications();
    if (name === "admin") switchAdminTab('stats');
}

function updateNav() {
    const isLoggedIn = !!currentUser;
    document.getElementById("nav-auth").classList.toggle("hidden", isLoggedIn);
    document.getElementById("nav-events").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-chats").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-notifications").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-profile").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-favorites").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-admin").classList.toggle("hidden", !isLoggedIn || !isAdmin());
    document.getElementById("nav-logout").classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
        updateUserInfoHeader();
        showSection("events");
        loadProfile();
        loadEvents();
        loadFavorites();
        updateUnreadBadge();
        updateNotificationsBadge();
        loadFilterCategories();
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

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password }),
        });

        if (resp.status === 401) {
            const txt = await resp.text();
            showMessage(txt, "error");
            return;
        }

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
        currentUser.vkId = profile.vkId;
        saveCurrentUser(currentUser);
        updateUserInfoHeader(profile);

        const isVkUser = profile.vkId !== null && profile.vkId !== undefined;

        const loginSection = document.getElementById("profile-login-section");
        const passwordSection = document.getElementById("profile-password-section");

        if (loginSection) {
            loginSection.classList.toggle("hidden", isVkUser);
        }

        if (passwordSection) {
            passwordSection.classList.toggle("hidden", isVkUser);
        }

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
        const queryString = buildFilterQueryString();
        const resp = await fetch(`${API_BASE_URL}/events?${queryString}`);
        if (!resp.ok) throw new Error("Ошибка загрузки событий");

        const events = await resp.json();
        const container = document.getElementById("events-list");
        container.innerHTML = "";

        if (!events || events.length === 0) {
            container.innerHTML = "<p>Событий не найдено.</p>";
            return;
        }

        events.forEach((ev) => {
            const card = document.createElement("div");
            card.className = "event-card";

            const date = ev.eventDate;
            const time = ev.eventTime ? ev.eventTime.substring(0, 5) : "";
            const statusText = ev.isCompleted ? "Событие завершено" : "Событие запланировано";
            const categoriesText = ev.categoryNames && ev.categoryNames.length
                ? ev.categoryNames.join(", ") : "не указаны";
            const durationText = ev.durationMinutes ? `${ev.durationMinutes} мин.` : "не указана";

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

            // Кнопка жалобы
            if (ev.creatorId !== currentUser.userId) {
                const reportBtn = document.createElement('button');
                reportBtn.className = 'report-btn';
                reportBtn.textContent = '⚑ Пожаловаться';
                reportBtn.onclick = () => openComplaintModal('event', ev.gameEventId);
                actions.appendChild(reportBtn);
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
                    <div style="display:flex;gap:0.3rem;align-items:center;">
                        ${review.isOwn ? `<div class="review-actions"><button class="btn" onclick="fillReviewForm()">Редактировать</button></div>` : ''}
                        ${!review.isOwn ? `<button class="report-btn" onclick="openComplaintModal('review', ${review.reviewId})">⚑</button>` : ''}
                    </div>
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
                        <div style="display:flex;gap:0.3rem;align-items:center;">
                            ${`<button class="report-btn" onclick="openComplaintModal('review', ${review.reviewId})">⚑</button>`}
                        </div>
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

// ====== ФИЛЬТРАЦИЯ СОБЫТИЙ ======

let allCategories = [];
let selectedFilterCategories = [];

async function loadFilterCategories() {
    try {
        const resp = await fetch(`${API_BASE_URL}/categories`);
        if (!resp.ok) return;
        allCategories = await resp.json();
    } catch (e) {
        console.error(e);
    }
}

function showCategoryDropdown() {
    const input = document.getElementById("filter-category-input");
    const filter = input.value.trim().toLowerCase();
    renderCategoryDropdown(filter);
    document.getElementById("filter-category-dropdown").classList.remove("hidden");
}

function filterCategoryDropdown() {
    const input = document.getElementById("filter-category-input").value.trim().toLowerCase();
    renderCategoryDropdown(input);
    document.getElementById("filter-category-dropdown").classList.remove("hidden");
}

function renderCategoryDropdown(filter) {
    const dropdown = document.getElementById("filter-category-dropdown");
    dropdown.innerHTML = "";

    const filtered = allCategories.filter(c =>
        c.name.toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="filter-category-option disabled">Ничего не найдено</div>';
        return;
    }

    filtered.forEach(cat => {
        const isSelected = selectedFilterCategories.some(s => s.id === cat.id);
        const opt = document.createElement("div");
        opt.className = "filter-category-option" + (isSelected ? " disabled" : "");
        opt.textContent = cat.name + (isSelected ? " ✓" : "");

        if (!isSelected) {
            opt.onclick = (e) => {
                e.stopPropagation();
                selectFilterCategory(cat);
            };
        }

        dropdown.appendChild(opt);
    });
}

function selectFilterCategory(cat) {
    if (selectedFilterCategories.some(c => c.id === cat.id)) return;
    selectedFilterCategories.push(cat);
    document.getElementById("filter-category-input").value = "";
    renderSelectedCategories();
    // Обновляем dropdown чтобы показать галочку
    renderCategoryDropdown("");
    document.getElementById("filter-category-dropdown").classList.add("hidden");
}

function removeFilterCategory(catId) {
    selectedFilterCategories = selectedFilterCategories.filter(c => c.id !== catId);
    renderSelectedCategories();
    updateFilterActiveCount();
}

function renderSelectedCategories() {
    const container = document.getElementById("filter-selected-categories");
    container.innerHTML = "";

    selectedFilterCategories.forEach(cat => {
        const tag = document.createElement("span");
        tag.className = "filter-category-tag";
        tag.innerHTML = `${cat.name} <span class="filter-category-tag-remove" onclick="removeFilterCategory(${cat.id})">×</span>`;
        container.appendChild(tag);
    });
}

function applyFilters() {
    updateFilterActiveCount();
    loadEvents();
}

function resetFilters() {
    selectedFilterCategories = [];
    document.getElementById("filter-title").value = "";
    document.getElementById("filter-category-input").value = "";
    document.getElementById("filter-date-from").value = "";
    document.getElementById("filter-date-to").value = "";
    document.getElementById("filter-players-to").value = "";
    renderSelectedCategories();
    updateFilterActiveCount();
    loadEvents();
}

function updateFilterActiveCount() {
    let count = 0;
    if (document.getElementById("filter-title")?.value.trim()) count++;
    if (selectedFilterCategories.length > 0) count++;
    if (document.getElementById("filter-date-from")?.value) count++;
    if (document.getElementById("filter-date-to")?.value) count++;
    if (document.getElementById("filter-players-to")?.value) count++;

    const badge = document.getElementById("filter-active-count");
    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

function buildFilterQueryString() {
    const params = new URLSearchParams();

    if (currentUser) {
        params.set("userId", currentUser.userId);
    }

    const title = document.getElementById("filter-title")?.value.trim();
    if (title) params.set("title", title);

    if (selectedFilterCategories.length > 0) {
        params.set("categories", selectedFilterCategories.map(c => c.name).join(","));
    }

    const dateFrom = document.getElementById("filter-date-from")?.value;
    if (dateFrom) params.set("dateFrom", dateFrom);

    const dateTo = document.getElementById("filter-date-to")?.value;
    if (dateTo) params.set("dateTo", dateTo);

    const playersTo = document.getElementById("filter-players-to")?.value;
    if (playersTo) params.set("maxPlayersTo", playersTo);

    return params.toString();
}

// ====== VK ID ======

function initVkIdButton() {
    if (!window.VKIDSDK) {
        console.warn("VKID SDK не загружен");
        return;
    }

    const container = document.getElementById("vkid-button-container");
    if (!container) return;

    container.innerHTML = "";

    const VKID = window.VKIDSDK;

    VKID.Config.init({
        app: VK_APP_ID,
        redirectUrl: VK_REDIRECT_URL,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: ""
    });

    const oneTap = new VKID.OneTap();

    oneTap.render({
        container: container,
        showAlternativeLogin: true,
        styles: {
            borderRadius: 50,
            width: 190,
            height: 36
        }
    })
        .on(VKID.WidgetEvents.ERROR, vkidOnError)
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async function (payload) {
            try {
                const code = payload.code;
                const deviceId = payload.device_id;

                const data = await VKID.Auth.exchangeCode(code, deviceId);
                await vkidOnSuccess(data);
            } catch (error) {
                vkidOnError(error);
            }
        });
}

function extractVkAccessToken(data) {
    return data?.access_token
        || data?.accessToken
        || data?.token
        || null;
}

function extractVkUserId(data) {
    const rawValue =
        data?.user_id
        ?? data?.userId
        ?? data?.user?.id
        ?? null;

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
}

async function vkidOnSuccess(data) {
    console.log("VK ID result:", data);

    const accessToken = extractVkAccessToken(data);
    const vkUserId = extractVkUserId(data);

    if (!accessToken || !vkUserId) {
        showMessage("Не удалось получить данные ВКонтакте", "error");
        return;
    }

    try {
        const vkProfile = await loadVkProfileFromClient(accessToken, vkUserId);

        const resp = await fetch(`${API_BASE_URL}/auth/vk-id-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                vkUserId: vkUserId,
                fullName: vkProfile.fullName,
                photo: vkProfile.photo,
                city: vkProfile.city
            })
        });

        if (resp.status === 401) {
            const txt = await resp.text();
            showMessage(txt, "error");
            return;
        }

        if (!resp.ok) {
            const txt = await resp.text();
            showMessage(`Ошибка входа через ВКонтакте: ${txt}`, "error");
            return;
        }

        const user = await resp.json();
        saveCurrentUser(user);
        updateNav();
        showMessage("Вы вошли через ВКонтакте", "info");
    } catch (err) {
        console.error(err);
        showMessage(`Ошибка входа через ВКонтакте: ${err.message}`, "error");
    }
}

function vkidOnError(error) {
    console.error("VK ID error:", error);
    showMessage("Ошибка входа через ВКонтакте", "error");
}

function loadVkProfileFromClient(accessToken, vkUserId) {
    return new Promise((resolve, reject) => {
        const callbackName = `vkJsonpCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        const cleanup = (scriptEl) => {
            try {
                delete window[callbackName];
            } catch { }
            if (scriptEl && scriptEl.parentNode) {
                scriptEl.parentNode.removeChild(scriptEl);
            }
        };

        const script = document.createElement("script");

        const timeout = setTimeout(() => {
            cleanup(script);
            reject(new Error("Тайм-аут при получении данных пользователя ВКонтакте"));
        }, 10000);

        window[callbackName] = function (json) {
            clearTimeout(timeout);
            cleanup(script);

            if (!json) {
                reject(new Error("ВКонтакте вернул пустой ответ"));
                return;
            }

            if (json.error) {
                reject(new Error(json.error.error_msg || "Ошибка ВКонтакте"));
                return;
            }

            const vkUser = json.response?.[0];
            if (!vkUser) {
                reject(new Error("ВКонтакте не вернул данные пользователя"));
                return;
            }

            const firstName = vkUser.first_name ?? "";
            const lastName = vkUser.last_name ?? "";
            const fullName = `${firstName} ${lastName}`.trim();

            const photo = vkUser.photo_200 ?? null;
            const city = vkUser.city?.title ?? null;

            resolve({
                fullName,
                photo,
                city
            });
        };

        const url =
            `https://api.vk.com/method/users.get` +
            `?user_ids=${encodeURIComponent(vkUserId)}` +
            `&fields=photo_200,city` +
            `&access_token=${encodeURIComponent(accessToken)}` +
            `&v=5.199` +
            `&callback=${callbackName}`;

        script.src = url;
        script.async = true;

        script.onerror = () => {
            clearTimeout(timeout);
            cleanup(script);
            reject(new Error("Не удалось загрузить данные пользователя ВКонтакте"));
        };

        document.body.appendChild(script);
    });
}

// ====== УВЕДОМЛЕНИЯ ======

async function loadNotifications() {
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.userId}`);
        if (!resp.ok) return;
        const notifications = await resp.json();
        const container = document.getElementById("notifications-list");

        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<p>У вас нет уведомлений</p>';
            return;
        }

        container.innerHTML = "";
        notifications.forEach(n => {
            const item = document.createElement("div");
            item.className = "notification-item" + (n.isRead ? "" : " unread");
            const date = new Date(n.createdAt).toLocaleString("ru-RU", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
            });
            item.innerHTML = `
                <div class="notification-icon">🔔</div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(n.title)}</div>
                    <div class="notification-message">${escapeHtml(n.message)}</div>
                    <div class="notification-footer">
                        <span class="notification-date">${date}</span>
                        <div class="notification-actions">
                            ${!n.isRead ? `<button class="btn" onclick="markNotificationRead(${n.notificationId})">Прочитано</button>` : ""}
                            <button class="btn" onclick="deleteNotification(${n.notificationId})">Удалить</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

async function updateNotificationsBadge() {
    if (!currentUser) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/notifications/user/${currentUser.userId}/unread-count`);
        if (!resp.ok) return;
        const count = await resp.json();
        const badge = document.getElementById("nav-notifications-badge");
        if (count > 0) {
            badge.textContent = count > 99 ? "99+" : count;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    } catch (err) { console.error(err); }
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: "PUT" });
        loadNotifications();
        updateNotificationsBadge();
    } catch (err) { console.error(err); }
}

async function markAllNotificationsRead() {
    if (!currentUser) return;
    try {
        await fetch(`${API_BASE_URL}/notifications/user/${currentUser.userId}/read-all`, { method: "PUT" });
        loadNotifications();
        updateNotificationsBadge();
        showMessage("Все уведомления отмечены как прочитанные", "info");
    } catch (err) { console.error(err); }
}

async function deleteNotification(notificationId) {
    try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}`, { method: "DELETE" });
        loadNotifications();
        updateNotificationsBadge();
    } catch (err) { console.error(err); }
}

// ====== ЖАЛОБЫ ======

function openComplaintModal(type, targetId) {
    document.getElementById('complaint-type').value = type;
    document.getElementById('complaint-target-id').value = targetId;
    document.getElementById('complaint-reason').value = '';
    document.getElementById('complaint-modal').classList.remove('hidden');
}

function closeComplaintModal() {
    document.getElementById('complaint-modal').classList.add('hidden');
}

async function submitComplaint(event) {
    event.preventDefault();
    if (!currentUser) return;
    const type = document.getElementById('complaint-type').value;
    const targetId = parseInt(document.getElementById('complaint-target-id').value);
    const reason = document.getElementById('complaint-reason').value.trim();
    if (!reason) { showMessage('Укажите причину', 'error'); return; }

    const body = {
        reporterId: currentUser.userId,
        complaintType: type,
        targetEventId: type === 'event' ? targetId : null,
        targetReviewId: type === 'review' ? targetId : null,
        reason
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!resp.ok) { const txt = await resp.text(); showMessage(`Ошибка: ${txt}`, 'error'); return; }
        closeComplaintModal();
        showMessage('Жалоба отправлена', 'info');
    } catch (err) { console.error(err); }
}

// ====== АДМИН-ПАНЕЛЬ ======

let currentAdminTab = 'stats';

function isAdmin() {
    return currentUser && currentUser.role === "admin";
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));

    const activeTab = document.querySelector(`.admin-tab[onclick="switchAdminTab('${tab}')"]`);
    if (activeTab) activeTab.classList.add('active');
    const panel = document.getElementById(`admin-panel-${tab}`);
    if (panel) panel.classList.remove('hidden');

    switch (tab) {
        case 'stats': loadAdminStats(); break;
        case 'complaints': loadAdminComplaints(); break;
        case 'events': loadAdminEvents(); break;
        case 'reviews': loadAdminReviews(); break;
        case 'users': loadAdminUsers(); break;
        case 'bans': loadAdminBans(); break;
        case 'categories': loadAdminCategories(); break;
    }
}

// ---- Статистика ----

async function loadAdminStats() {
    if (!isAdmin()) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/stats?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const s = await resp.json();
        document.getElementById('admin-stats-grid').innerHTML = `
            <div class="admin-stat-card"><div class="admin-stat-value">${s.totalUsers}</div><div class="admin-stat-label">Пользователей</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value">${s.totalEvents}</div><div class="admin-stat-label">Всего событий</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value">${s.activeEvents}</div><div class="admin-stat-label">Активных</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value">${s.completedEvents}</div><div class="admin-stat-label">Завершённых</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value">${s.totalMessages}</div><div class="admin-stat-label">Сообщений</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value">${s.totalReviews}</div><div class="admin-stat-label">Отзывов</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value" style="color:#f39c12">${s.pendingComplaints}</div><div class="admin-stat-label">Жалоб (ожидание)</div></div>
            <div class="admin-stat-card"><div class="admin-stat-value" style="color:#e74c3c">${s.activeUserBans + s.activeReviewBans}</div><div class="admin-stat-label">Активных банов</div></div>
        `;
    } catch (err) { console.error(err); }
}

// ---- Жалобы ----

async function loadAdminComplaints() {
    if (!isAdmin()) return;
    const status = document.getElementById('admin-complaints-filter').value;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/complaints?adminUserId=${currentUser.userId}&status=${status}`);
        if (!resp.ok) return;
        const complaints = await resp.json();
        const container = document.getElementById('admin-complaints-list');

        if (!complaints.length) { container.innerHTML = '<p>Жалоб нет</p>'; return; }
        container.innerHTML = '';

        complaints.forEach(c => {
            const card = document.createElement('div');
            card.className = `complaint-card ${c.status}`;
            const statusText = { pending: 'Ожидает', reviewed: 'Рассмотрена', dismissed: 'Отклонена' }[c.status] || c.status;
            const date = new Date(c.createdAt).toLocaleString('ru-RU');

            let targetInfo = '';
            if (c.complaintType === 'event') {
                targetInfo = `<strong>Событие:</strong> ${c.targetEventTitle || '[удалено]'} (автор: ${c.targetEventCreatorName || '—'})`;
            } else {
                targetInfo = `<strong>Отзыв:</strong> от ${c.targetReviewAuthorName || '—'} о ${c.targetReviewTargetUserName || '—'}<br/>"${c.targetReviewComment ? truncateText(c.targetReviewComment, 80) : '[удалён]'}"`;
            }

            card.innerHTML = `
                <div class="complaint-header">
                    <span class="complaint-type-badge ${c.complaintType}">${c.complaintType === 'event' ? 'Событие' : 'Отзыв'}</span>
                    <span class="complaint-status-badge ${c.status}">${statusText}</span>
                </div>
                <div class="complaint-meta">От: <span class="clickable-user" onclick="openPublicProfile(${c.reporterId})">${c.reporterName}</span> | ${date}</div>
                <div class="complaint-body">${targetInfo}</div>
                <div class="complaint-body"><strong>Причина:</strong> ${escapeHtml(c.reason)}</div>
                ${c.adminComment ? `<div class="complaint-body"><strong>Комментарий админа:</strong> ${escapeHtml(c.adminComment)}</div>` : ''}
                <div class="complaint-actions">
                    ${c.status === 'pending' ? `<button class="btn primary" onclick="openResolveComplaint(${c.complaintId})">Рассмотреть</button>` : ''}
                    ${c.complaintType === 'event' && c.targetEventId ? `
                        <button class="btn" onclick="openEventDetails(${c.targetEventId})">Просмотр</button>
                        <button class="btn" style="background:#e74c3c;color:#fff;" onclick="openAdminDeleteModal(${c.targetEventId}, '${escapeHtmlAttr(c.targetEventTitle || '')}')">Удалить событие</button>
                    ` : ''}
                    ${c.complaintType === 'review' && c.targetReviewId ? `
                        <button class="btn" style="background:#e74c3c;color:#fff;" onclick="adminDeleteReviewFromComplaint(${c.targetReviewId})">Удалить отзыв</button>
                    ` : ''}
                    ${c.targetReviewAuthorId ? `<button class="btn" onclick="openBanModal('review', ${c.targetReviewAuthorId}, '${escapeHtmlAttr(c.targetReviewAuthorName || '')}')">Бан отзывов</button>` : ''}
                    ${(c.targetEventCreatorId || c.targetReviewAuthorId) ? `<button class="btn" style="background:#e74c3c;color:#fff;font-size:0.8rem;" onclick="openBanModal('user', ${c.targetReviewAuthorId || c.targetEventCreatorId}, '${escapeHtmlAttr(c.targetReviewAuthorName || c.targetEventCreatorName || '')}')">Бан пользователя</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

async function adminDeleteReviewFromComplaint(reviewId) {
    if (!confirm('Удалить этот отзыв?')) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}?adminUserId=${currentUser.userId}`, { method: 'DELETE' });
        if (!resp.ok) { showMessage('Ошибка удаления отзыва', 'error'); return; }
        showMessage('Отзыв удалён', 'info');
        loadAdminComplaints();
    } catch (err) { console.error(err); }
}

function openResolveComplaint(complaintId) {
    document.getElementById('resolve-complaint-id').value = complaintId;
    document.getElementById('resolve-complaint-comment').value = '';
    document.getElementById('resolve-complaint-modal').classList.remove('hidden');
}

function closeResolveComplaintModal() {
    document.getElementById('resolve-complaint-modal').classList.add('hidden');
}

async function submitResolveComplaint(event) {
    event.preventDefault();
    if (!isAdmin()) return;
    const complaintId = document.getElementById('resolve-complaint-id').value;
    const status = document.getElementById('resolve-complaint-status').value;
    const adminComment = document.getElementById('resolve-complaint-comment').value.trim();

    try {
        const resp = await fetch(`${API_BASE_URL}/admin/complaints/${complaintId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId: currentUser.userId, status, adminComment: adminComment || null })
        });
        if (!resp.ok) { showMessage('Ошибка', 'error'); return; }
        closeResolveComplaintModal();
        showMessage('Жалоба рассмотрена', 'info');
        loadAdminComplaints();
    } catch (err) { console.error(err); }
}

// ---- События ----

async function loadAdminEvents() {
    if (!isAdmin()) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/events?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const events = await resp.json();
        const container = document.getElementById('admin-events-list');
        container.innerHTML = '';
        if (!events.length) { container.innerHTML = '<p>Событий нет</p>'; return; }

        events.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'event-card';
            const statusText = ev.isCompleted ? 'Завершено' : 'Активно';
            card.innerHTML = `
                <div class="event-title">${ev.title}</div>
                <div class="event-meta">
                    ${ev.eventDate} | ${ev.address} | Игроков: ${ev.maxPlayers} | ${statusText}<br/>
                    Организатор: <span class="clickable-user" onclick="openPublicProfile(${ev.creatorId})">${ev.creatorName}</span>
                </div>
                <div class="event-actions">
                    <button class="btn" onclick="openEventDetails(${ev.gameEventId})">Подробнее</button>
                    <button class="btn" style="background:#e74c3c;color:#fff;" onclick="openAdminDeleteModal(${ev.gameEventId}, '${escapeHtmlAttr(ev.title)}')">Удалить</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

function openAdminDeleteModal(eventId, title) {
    document.getElementById('admin-delete-event-id').value = eventId;
    document.getElementById('admin-delete-event-title').textContent = `Событие: «${title}»`;
    document.getElementById('admin-delete-reason').value = '';
    document.getElementById('admin-delete-modal').classList.remove('hidden');
}

function closeAdminDeleteModal() {
    document.getElementById('admin-delete-modal').classList.add('hidden');
}

async function submitAdminDeleteEvent(event) {
    event.preventDefault();
    if (!isAdmin()) return;
    const eventId = document.getElementById('admin-delete-event-id').value;
    const reason = document.getElementById('admin-delete-reason').value.trim();
    if (!reason) { showMessage('Укажите причину', 'error'); return; }

    try {
        const resp = await fetch(`${API_BASE_URL}/admin/events/${eventId}`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId: currentUser.userId, reason })
        });
        if (!resp.ok) { const txt = await resp.text(); showMessage(`Ошибка: ${txt}`, 'error'); return; }
        closeAdminDeleteModal();
        showMessage('Событие удалено', 'info');
        loadAdminEvents();
    } catch (err) { console.error(err); }
}

// ---- Отзывы ----

async function loadAdminReviews() {
    if (!isAdmin()) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/reviews?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const reviews = await resp.json();
        const container = document.getElementById('admin-reviews-list');
        container.innerHTML = '';
        if (!reviews.length) { container.innerHTML = '<p>Отзывов нет</p>'; return; }

        reviews.forEach(r => {
            const item = document.createElement('div');
            item.className = 'admin-list-item';
            const emoji = getRatingEmoji(r.rating);
            const date = new Date(r.createdAt).toLocaleDateString('ru-RU');
            item.innerHTML = `
                <img class="admin-list-avatar" src="${r.reviewerPhoto || 'img/user-placeholder.png'}" onclick="openPublicProfile(${r.reviewerId})">
                <div class="admin-list-info">
                    <div class="admin-list-name">
                        <span class="clickable-user" onclick="openPublicProfile(${r.reviewerId})">${r.reviewerName}</span> →
                        <span class="clickable-user" onclick="openPublicProfile(${r.targetUserId})">${r.targetUserName}</span> ${emoji}
                    </div>
                    <div class="admin-list-detail">${truncateText(r.comment, 100)}</div>
                    <div class="admin-list-detail" style="color:#999;">${date}</div>
                </div>
                <div class="admin-list-actions">
                    <button class="btn" onclick="openBanModal('review', ${r.reviewerId}, '${escapeHtmlAttr(r.reviewerName)}')">Бан отзывов</button>
                    <button class="btn" style="background:#e74c3c;color:#fff;font-size:0.8rem;" onclick="adminDeleteReview(${r.reviewId})">Удалить</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

async function adminDeleteReview(reviewId) {
    if (!confirm('Удалить этот отзыв?')) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}?adminUserId=${currentUser.userId}`, { method: 'DELETE' });
        if (!resp.ok) { showMessage('Ошибка удаления', 'error'); return; }
        showMessage('Отзыв удалён', 'info');
        loadAdminReviews();
    } catch (err) { console.error(err); }
}

// ---- Пользователи ----

async function loadAdminUsers() {
    if (!isAdmin()) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/users?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const users = await resp.json();
        const container = document.getElementById('admin-users-list');
        container.innerHTML = '';

        users.forEach(u => {
            const item = document.createElement('div');
            item.className = 'admin-list-item';
            item.innerHTML = `
                <img class="admin-list-avatar" src="${u.photo || 'img/user-placeholder.png'}" onclick="openPublicProfile(${u.userId})">
                <div class="admin-list-info">
                    <div class="admin-list-name">
                        <span class="clickable-user" onclick="openPublicProfile(${u.userId})">${u.fullName}</span>
                        <span style="color:#999;font-size:0.8rem;margin-left:0.3rem;">${u.login}</span>
                    </div>
                    <div class="admin-list-detail">
                        ${u.city || '—'} | Создано: ${u.eventsCreated} | Участвовал: ${u.eventsParticipated} | Отзывов: ${u.reviewsWritten}/${u.reviewsReceived}
                    </div>
                    <div class="admin-list-badges">
                        ${u.role === 'admin' ? '<span class="badge-admin">Админ</span>' : ''}
                        ${u.isVkUser ? '<span class="badge-vk">ВК</span>' : ''}
                        ${u.isBanned ? '<span class="badge-banned">Забанен</span>' : ''}
                        ${u.isReviewBanned ? '<span class="badge-banned">Бан отзывов</span>' : ''}
                    </div>
                </div>
                <div class="admin-list-actions">
                    ${u.role !== 'admin' ? `
                        <button class="btn" onclick="openBanModal('review', ${u.userId}, '${escapeHtmlAttr(u.fullName)}')">Бан отзывов</button>
                        <button class="btn" style="background:#e74c3c;color:#fff;font-size:0.8rem;" onclick="openBanModal('user', ${u.userId}, '${escapeHtmlAttr(u.fullName)}')">Бан</button>
                    ` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

// ---- Баны ----

async function loadAdminBans() {
    if (!isAdmin()) return;
    await loadReviewBans();
    await loadUserBans();
}

async function loadReviewBans() {
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/review-bans?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const bans = await resp.json();
        const container = document.getElementById('admin-review-bans-list');
        container.innerHTML = '';
        if (!bans.length) { container.innerHTML = '<p>Нет банов на отзывы</p>'; return; }

        bans.forEach(b => {
            const item = document.createElement('div');
            item.className = 'admin-list-item';
            const expiryText = b.expiresAt ? new Date(b.expiresAt).toLocaleString('ru-RU') : 'Навсегда';

            let statusText;
            if (b.isActive) {
                statusText = '🔴 Активен';
            } else if (b.unbannedByName) {
                statusText = `🟢 Разбанен (${b.unbannedByName})`;
            } else {
                statusText = '⚪ Истёк';
            }

            item.innerHTML = `
                <div class="admin-list-info">
                    <div class="admin-list-name"><span class="clickable-user" onclick="openPublicProfile(${b.userId})">${b.userName}</span> ${statusText}</div>
                    <div class="admin-list-detail">Причина: ${b.reason}</div>
                    <div class="admin-list-detail" style="color:#999;">До: ${expiryText} | Забанил: ${b.bannedByName}</div>
                    ${b.unbannedAt ? `<div class="admin-list-detail" style="color:#27ae60;">Разбанен: ${new Date(b.unbannedAt).toLocaleString('ru-RU')}</div>` : ''}
                </div>
                <div class="admin-list-actions">
                    ${b.isActive ? `<button class="btn" onclick="removeReviewBan(${b.banId})">Снять</button>` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

async function loadUserBans() {
    try {
        const resp = await fetch(`${API_BASE_URL}/admin/user-bans?adminUserId=${currentUser.userId}`);
        if (!resp.ok) return;
        const bans = await resp.json();
        const container = document.getElementById('admin-user-bans-list');
        container.innerHTML = '';
        if (!bans.length) { container.innerHTML = '<p>Нет забаненных пользователей</p>'; return; }

        bans.forEach(b => {
            const item = document.createElement('div');
            item.className = 'admin-list-item';
            const expiryText = b.expiresAt ? new Date(b.expiresAt).toLocaleString('ru-RU') : 'Навсегда';

            let statusText;
            if (b.isActive) {
                statusText = '🔴 Активен';
            } else if (b.unbannedByName) {
                statusText = `🟢 Разбанен (${b.unbannedByName})`;
            } else {
                statusText = '⚪ Истёк';
            }

            item.innerHTML = `
                <div class="admin-list-info">
                    <div class="admin-list-name"><span class="clickable-user" onclick="openPublicProfile(${b.userId})">${b.userName}</span> ${statusText}</div>
                    <div class="admin-list-detail">Причина: ${b.reason}</div>
                    <div class="admin-list-detail" style="color:#999;">До: ${expiryText} | Забанил: ${b.bannedByName}</div>
                    ${b.unbannedAt ? `<div class="admin-list-detail" style="color:#27ae60;">Разбанен: ${new Date(b.unbannedAt).toLocaleString('ru-RU')}</div>` : ''}
                </div>
                <div class="admin-list-actions">
                    ${b.isActive ? `<button class="btn" onclick="removeUserBan(${b.banId})">Разбанить</button>` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

async function removeReviewBan(banId) {
    if (!confirm('Снять бан на отзывы?')) return;
    try {
        await fetch(`${API_BASE_URL}/admin/review-bans/${banId}?adminUserId=${currentUser.userId}`, { method: 'DELETE' });
        showMessage('Бан снят', 'info');
        loadAdminBans();
    } catch (err) { console.error(err); }
}

async function removeUserBan(banId) {
    if (!confirm('Разбанить пользователя?')) return;
    try {
        await fetch(`${API_BASE_URL}/admin/user-bans/${banId}?adminUserId=${currentUser.userId}`, { method: 'DELETE' });
        showMessage('Пользователь разбанен', 'info');
        loadAdminBans();
    } catch (err) { console.error(err); }
}

// ---- Модалка бана ----

function openBanModal(type, userId, userName) {
    document.getElementById('ban-type').value = type;
    document.getElementById('ban-user-id').value = userId;
    document.getElementById('ban-user-name').textContent = userName;
    document.getElementById('ban-modal-title').textContent = type === 'review' ? 'Бан на отзывы' : 'Бан пользователя';
    document.getElementById('ban-reason').value = '';
    document.getElementById('ban-modal').classList.remove('hidden');
}

function closeBanModal() {
    document.getElementById('ban-modal').classList.add('hidden');
}

async function submitBan(event) {
    event.preventDefault();
    if (!isAdmin()) return;
    const type = document.getElementById('ban-type').value;
    const userId = parseInt(document.getElementById('ban-user-id').value);
    const reason = document.getElementById('ban-reason').value.trim();
    const duration = document.getElementById('ban-duration').value;
    if (!reason) { showMessage('Укажите причину', 'error'); return; }

    const url = type === 'review' ? `${API_BASE_URL}/admin/review-bans` : `${API_BASE_URL}/admin/user-bans`;
    try {
        const resp = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId: currentUser.userId, userId, reason, duration })
        });
        if (!resp.ok) { const txt = await resp.text(); showMessage(`Ошибка: ${txt}`, 'error'); return; }
        closeBanModal();
        showMessage('Бан применён', 'info');
        if (currentAdminTab === 'bans') loadAdminBans();
        if (currentAdminTab === 'users') loadAdminUsers();
    } catch (err) { console.error(err); }
}

// ---- Категории ----

async function loadAdminCategories() {
    if (!isAdmin()) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/categories`);
        if (!resp.ok) return;
        const cats = await resp.json();
        const container = document.getElementById('admin-categories-list');
        container.innerHTML = '';

        cats.forEach(c => {
            const item = document.createElement('div');
            item.className = 'admin-category-item';
            item.innerHTML = `
                <div>
                    <div class="admin-category-name">${c.name}</div>
                </div>
                <div style="display:flex;gap:0.3rem;">
                    <button class="btn" onclick="openCategoryForm(${c.id}, '${escapeHtmlAttr(c.name)}')">Ред.</button>
                    <button class="btn" onclick="adminDeleteCategory(${c.id})">Удалить</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) { console.error(err); }
}

function openCategoryForm(id = null, name = '') {
    document.getElementById('category-edit-id').value = id || '';
    document.getElementById('category-name').value = name;
    document.getElementById('category-modal-title').textContent = id ? 'Редактировать категорию' : 'Добавить категорию';
    document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
}

async function submitCategory(event) {
    event.preventDefault();
    if (!isAdmin()) return;
    const id = document.getElementById('category-edit-id').value;
    const name = document.getElementById('category-name').value.trim();
    if (!name) { showMessage('Введите название', 'error'); return; }

    try {
        let resp;
        if (id) {
            resp = await fetch(`${API_BASE_URL}/admin/categories/${id}?adminUserId=${currentUser.userId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
        } else {
            resp = await fetch(`${API_BASE_URL}/admin/categories?adminUserId=${currentUser.userId}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
        }
        if (!resp.ok) { const txt = await resp.text(); showMessage(`Ошибка: ${txt}`, 'error'); return; }
        closeCategoryModal();
        showMessage('Категория сохранена', 'info');
        loadAdminCategories();
        loadFilterCategories();
    } catch (err) { console.error(err); }
}

async function adminDeleteCategory(id) {
    if (!confirm('Удалить категорию?')) return;
    try {
        await fetch(`${API_BASE_URL}/admin/categories/${id}?adminUserId=${currentUser.userId}`, { method: 'DELETE' });
        showMessage('Категория удалена', 'info');
        loadAdminCategories();
        loadFilterCategories();
    } catch (err) { console.error(err); }
}

function escapeHtmlAttr(text) {
    return (text || '').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
}

async function checkCurrentUserBan() {
    if (!currentUser) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/auth/check-ban?userId=${currentUser.userId}`);
        if (resp.status === 401) {
            const txt = await resp.text();
            showMessage(txt, "error");
            logout();
            return;
        }
    } catch (err) {
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUserFromStorage();

    const fileInput = document.getElementById("profile-photo-file");
    if (fileInput) {
        fileInput.addEventListener("change", handlePhotoFileChange);
    }

    initVkIdButton();

    // Закрывать emoji picker
    document.addEventListener("click", (e) => {
        const picker = document.getElementById("emoji-picker");
        const emojiBtn = e.target.closest(".emoji-btn");
        if (!picker.contains(e.target) && !emojiBtn) {
            picker.classList.add("hidden");
        }
    });

    // Закрывать dropdown категорий при клике вне
    document.addEventListener("click", (e) => {
        const wrapper = document.querySelector(".filter-categories-wrapper");
        const dropdown = document.getElementById("filter-category-dropdown");
        if (wrapper && dropdown && !wrapper.contains(e.target)) {
            dropdown.classList.add("hidden");
        }
    });

    setInterval(() => {
        updateUnreadBadge();
        updateNotificationsBadge();
        checkCurrentUserBan();
    }, 30000);
});

document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".filter-categories-wrapper");
    const dropdown = document.getElementById("filter-category-dropdown");
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.add("hidden");
    }
});