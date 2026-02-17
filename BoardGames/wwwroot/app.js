const API_BASE_URL = "https://localhost:7267/api";

let currentUser = null;

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
    const sections = ["auth", "events", "profile", "favorites"];
    sections.forEach((s) => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.classList.toggle("hidden", s !== name);
    });
}

function updateNav() {
    const isLoggedIn = !!currentUser;
    document.getElementById("nav-auth").classList.toggle("hidden", isLoggedIn);
    document.getElementById("nav-events").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-profile").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-favorites").classList.toggle("hidden", !isLoggedIn);
    document.getElementById("nav-logout").classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
        updateUserInfoHeader();
        showSection("events");
        loadProfile();
        loadEvents();
        loadFavorites();
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
    localStorage.removeItem("currentUser");

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

        if (!auto) {
            showMessage("Фото загружено. Нажмите «Сохранить профиль», чтобы применить.", "info");
        } else {
            showMessage("Фото загружено. Нажмите «Сохранить профиль», чтобы применить.", "info");
        }
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

            const favBtn = document.createElement("button");
            favBtn.className = "btn secondary";
            favBtn.textContent = "В избранное (шаблон)";
            favBtn.onclick = () => createFavoriteFromEvent(ev.gameEventId);
            actions.appendChild(favBtn);

            const detailsBtn = document.createElement("button");
            detailsBtn.className = "btn";
            detailsBtn.textContent = "Подробнее";
            detailsBtn.onclick = () => openEventDetails(ev.gameEventId);
            actions.appendChild(detailsBtn);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn";
            deleteBtn.textContent = "Удалить";
            deleteBtn.onclick = () => deleteEvent(ev.gameEventId);
            actions.appendChild(deleteBtn);

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
    try {
        const resp = await fetch(`${API_BASE_URL}/events/${id}`, { method: "DELETE" });
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
                <img class="event-organizer-avatar" src="${creatorPhoto}" alt="${ev.creatorName}">
                <div class="event-organizer-info">
                    <div class="event-organizer-name">${ev.creatorName}</div>
                    <div class="event-organizer-phone">
                        ${ev.creatorPhone || "телефон не указан"}
                    </div>
                </div>
            </div>
        `;

        if (ev.participants && ev.participants.length > 0) {
            html += `<h4>Участники (${ev.participants.length}):</h4><div class="participant-list">`;
            ev.participants.forEach(p => {
                const photo = p.photo || "img/user-placeholder.png";
                const phoneText = p.phone || "телефон не указан";
                const commentText = p.comment ? `Комментарий: ${p.comment}` : "Комментарий не указан";

                html += `
            <div class="participant-item">
                <img class="participant-avatar" src="${photo}" alt="${p.fullName}">
                <div class="participant-info">
                    <div class="participant-name">${p.fullName}</div>
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

// ====== Инициализация ======

document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUserFromStorage();

    const fileInput = document.getElementById("profile-photo-file");
    if (fileInput) {
        fileInput.addEventListener("change", handlePhotoFileChange);
    }
});