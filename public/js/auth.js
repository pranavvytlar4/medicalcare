/**
 * ============================================================================
 * Authentication Management Module (ES6)
 * Satisfies Q5 (async/await, fetch, Promises, Destructuring, Template Literals)
 * and Q8 (JWT & Session token management)
 * ============================================================================
 */

// ============================================================================
// Global Website Content & Copy Protection Engine
// Disables text selection/highlighting, copy events, and context menus
// ============================================================================
(() => {
    const isEditable = (target) => {
        if (!target) return false;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]'));
    };

    // 1. Prevent copy events
    document.addEventListener('copy', (e) => {
        if (!isEditable(e.target)) {
            e.preventDefault();
            if (e.clipboardData) {
                e.clipboardData.clearData();
            }
            return false;
        }
    }, true);

    // 2. Prevent cut events outside inputs
    document.addEventListener('cut', (e) => {
        if (!isEditable(e.target)) {
            e.preventDefault();
            return false;
        }
    }, true);

    // 3. Prevent text selection initiation
    document.addEventListener('selectstart', (e) => {
        if (!isEditable(e.target)) {
            e.preventDefault();
            return false;
        }
    }, true);

    // 4. Prevent right-click context menu (which provides Copy, Save, Inspect)
    document.addEventListener('contextmenu', (e) => {
        if (!isEditable(e.target)) {
            e.preventDefault();
            return false;
        }
    }, true);

    // 5. Prevent keyboard shortcuts: Ctrl+C / Cmd+C, Ctrl+X, Ctrl+U, Ctrl+S, Ctrl+A outside inputs
    document.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;

        const key = (e.key || '').toLowerCase();
        const editable = isEditable(e.target);

        // Disallow Copy & Cut outside inputs
        if ((key === 'c' || key === 'x') && !editable) {
            e.preventDefault();
            return false;
        }

        // Disallow Select All outside inputs
        if (key === 'a' && !editable) {
            e.preventDefault();
            return false;
        }

        // Disallow View Source (Ctrl+U) and Save Page (Ctrl+S) globally
        if (key === 'u' || key === 's') {
            e.preventDefault();
            return false;
        }
    }, true);

    // 6. Prevent drag-and-drop text extraction
    document.addEventListener('dragstart', (e) => {
        if (!isEditable(e.target)) {
            e.preventDefault();
            return false;
        }
    }, true);
})();

const TOKEN_KEY = 'medical_care_jwt_token';
const USER_KEY = 'medical_care_user_profile';

/**
 * Determine relative path prefix so links work in both root and subfolders,
 * and under both http:// and file:// protocols.
 */
const getPrefix = () => {
    const p = window.location.pathname.replace(/\\/g, '/');
    if (p.includes('/appointment/') || p.includes('/donor/') || p.includes('/medicine/') || p.includes('/wellness/') || p.includes('/medical/') || p.includes('/admin/') || p.includes('/doctor/')) {
        return '../';
    }
    return '';
};

/**
 * Get stored token
 */
const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Get stored user profile
 */
const getCurrentUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    try {
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        if (user && user.name && user.name.includes('(Admin)')) {
            user.name = user.name.replace(/\s*\(Admin\)/gi, '').trim();
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
        return user;
    } catch {
        return null;
    }
};

/**
 * Save auth session
 */
const setAuthSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Clear auth session
 */
const clearAuthSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

/**
 * Get headers including JWT Bearer token
 */
const getAuthHeaders = () => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

/**
 * Wrapper around fetch() with ES6 async/await, try/catch, and automatic token attachment
 */
const apiFetch = async (url, options = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        // If unauthorized token expired
        if (response.status === 401) {
            clearAuthSession();
            const currentPath = window.location.pathname;
            const isAuthPage = currentPath.includes('login') || currentPath.includes('register');
            if (!isAuthPage) {
                window.location.href = getPrefix() + 'login?session_expired=1';
            }
        }

        return { response, data };
    } catch (error) {
        console.error(`[API Fetch Error on ${url}]:`, error);
        throw error;
    }
};

/**
 * Log out user from both JWT and Express Session
 */
const logout = async () => {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.warn('Logout network error:', error);
    } finally {
        clearAuthSession();
        window.location.href = getPrefix() + 'login';
    }
};

const AUTH_CHANNEL_NAME = 'medical_care_auth_sync_channel';
const authChannel = (typeof window !== 'undefined' && 'BroadcastChannel' in window)
    ? new BroadcastChannel(AUTH_CHANNEL_NAME)
    : null;

let _syncPromise = null;
let _lastSyncTimestamp = 0;

/**
 * Synchronize the current user's profile and permissions directly with the server.
 * If role or permissions change, immediately updates localStorage, the navbar, and fires events.
 */
const syncCurrentUser = async (force = false) => {
    const token = getToken();
    if (!token) return null;

    const now = Date.now();
    if (!force && now - _lastSyncTimestamp < 2000) {
        return getCurrentUser();
    }

    if (_syncPromise) {
        return _syncPromise;
    }

    _syncPromise = (async () => {
        try {
            const { response, data } = await apiFetch('/api/auth/me');
            _lastSyncTimestamp = Date.now();

            if (response.ok && data && data.user) {
                const prevUser = getCurrentUser();
                const newUser = data.user;
                const newToken = data.token || token;

                const prevRole = (prevUser?.role || '').toLowerCase().trim();
                const newRole = (newUser?.role || '').toLowerCase().trim();
                const prevDoc = Boolean(prevUser?.doctorAccess);
                const newDoc = Boolean(newUser?.doctorAccess);

                const roleOrPermissionChanged = prevRole !== newRole || prevDoc !== newDoc;

                // Save latest credentials and profile
                setAuthSession(newToken, newUser);

                if (roleOrPermissionChanged && prevUser) {
                    console.log(`[Auth Sync] Permissions updated: ${prevUser.role} -> ${newUser.role}`);

                    // Re-render navigation bar with new role options
                    renderNavbarAuth();

                    // If user is currently on the dashboard, update Doctor Banner
                    const docBanner = document.getElementById('doctorBannerSection');
                    if (docBanner) {
                        if (isDoctor()) {
                            docBanner.classList.remove('d-none');
                        } else {
                            docBanner.classList.add('d-none');
                        }
                    }

                    // Natural, human-friendly notification
                    let notificationText = `Your account role has been updated to ${newUser.role}.`;
                    if (newRole === 'doctor') {
                        notificationText = 'Doctor access granted: Your Doctor Console is now unlocked and ready to use.';
                    } else if (newRole === 'admin') {
                        notificationText = 'Administrator privileges granted: You now have full access to clinic management.';
                    } else if (newRole === 'patient') {
                        notificationText = 'Your account has been switched to Patient mode.';
                    }

                    showToast(notificationText, 'success');

                    // Broadcast to any other open tabs or windows
                    broadcastRoleChange(newUser.id || newUser._id, newUser.role);

                    // Dispatch custom event for page listeners
                    window.dispatchEvent(new CustomEvent('medical_care_role_updated', {
                        detail: { prevUser, user: newUser }
                    }));
                }

                return newUser;
            } else if (response.status === 401) {
                clearAuthSession();
                renderNavbarAuth();
            }
        } catch (err) {
            console.warn('[Auth Live Sync] Background check error:', err);
        } finally {
            _syncPromise = null;
        }

        return getCurrentUser();
    })();

    return _syncPromise;
};

/**
 * Broadcast role change event across tabs
 */
const broadcastRoleChange = (userId, newRole) => {
    try {
        if (authChannel) {
            authChannel.postMessage({ type: 'ROLE_UPDATED', userId, newRole, timestamp: Date.now() });
        }
        localStorage.setItem('medical_care_sync_trigger', Date.now().toString());
    } catch (e) {
        console.warn('Broadcast error:', e);
    }
};

// Listen to broadcast messages across tabs
if (authChannel) {
    authChannel.onmessage = (event) => {
        if (event.data && (event.data.type === 'ROLE_UPDATED' || event.data.type === 'SESSION_SET')) {
            syncCurrentUser(true);
        }
    };
}

// Cross-tab storage event listener
window.addEventListener('storage', (e) => {
    if (e.key === 'medical_care_sync_trigger' || e.key === USER_KEY) {
        syncCurrentUser(true);
        renderNavbarAuth();
    }
});

// Window focus & tab visibility change auto-sync
window.addEventListener('focus', () => {
    if (getToken()) syncCurrentUser(true);
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getToken()) {
        syncCurrentUser(true);
    }
});

// Periodic lightweight background sync polling
let _pollTimer = null;
const startLiveSyncPolling = () => {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => {
        if (getToken() && document.visibilityState !== 'hidden') {
            syncCurrentUser(false);
        }
    }, 3500);
};

const isAdmin = () => {
    const user = getCurrentUser();
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    const role = (user.role || '').toLowerCase().trim();
    return role === 'admin' || email === 'pranavvaitla2@gmail.com';
};

const isDoctor = () => {
    const user = getCurrentUser();
    if (!user) return false;
    // Admins only access Admin Dashboard, not Doctor Console
    if (isAdmin()) return false;
    const role = (user.role || '').toLowerCase().trim();
    // Only users who have been granted Doctor permission by an Admin in the Admin Panel can access
    return user.doctorAccess === true || role === 'doctor';
};

/**
 * Route protection guard for admin-only pages
 * Checks locally first, but syncs lively with server before denying access
 */
const requireAdmin = async () => {
    if (!requireAuth()) return false;

    // Check with server live before denying access
    if (!isAdmin()) {
        try {
            await syncCurrentUser(true);
        } catch (e) {
            console.warn('Real-time admin sync error:', e);
        }
    }

    if (!isAdmin()) {
        const prefix = getPrefix();
        showToast('Access Restricted: This section requires Administrator permissions.', 'danger');
        setTimeout(() => {
            window.location.href = `${prefix}dashboard`;
        }, 1200);
        return false;
    }
    return true;
};

/**
 * Route protection guard for doctor console
 * Requires explicit Doctor Panel Permission granted by Admin
 */
const requireDoctor = async () => {
    if (!requireAuth()) return false;

    // Live verification with server to guarantee current Doctor permission
    try {
        await syncCurrentUser(true);
    } catch (e) {
        console.warn('Real-time permission sync error:', e);
    }

    if (isAdmin()) {
        const prefix = getPrefix();
        showToast('Doctor Console is reserved for Doctor accounts. Please use the Admin Dashboard.', 'warning');
        setTimeout(() => {
            window.location.href = `${prefix}admin/`;
        }, 1200);
        return false;
    }

    if (!isDoctor()) {
        const prefix = getPrefix();
        showToast('Access Denied: You do not have permission to access the Doctor Panel. Permission must be granted by an Admin.', 'danger');
        setTimeout(() => {
            window.location.href = `${prefix}dashboard`;
        }, 1200);
        return false;
    }
    return true;
};

/**
 * Render dynamic navigation bar based on auth state
 */
const renderNavbarAuth = () => {
    const authContainer = document.getElementById('navbarAuthSection');
    if (!authContainer) return;

    const user = getCurrentUser();
    const prefix = getPrefix();
    const isUserAdmin = isAdmin();
    const isUserDoctor = isDoctor();

    if (user) {
        const cleanName = (user.name || '').replace(/\s*\(Admin\)/gi, '').trim() || user.name;
        authContainer.innerHTML = `
            <div class="d-flex align-items-center gap-2 flex-shrink-0 text-nowrap">
                <div class="dropdown nav-item flex-shrink-0" id="userDropdownWrapper">
                    <button id="userNavDropdown" class="btn btn-sm btn-light border rounded-pill dropdown-toggle d-flex align-items-center gap-2 px-3 py-1 text-nowrap shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.86rem; cursor: pointer;">
                        <i class="bi bi-person-circle text-primary fs-6"></i>
                        <span class="fw-bold">${cleanName}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-lg rounded-4 p-2 border" style="min-width: 240px;">
                        <li><h6 class="dropdown-header text-muted small pb-1">${user.email}</h6></li>
                        <li><a class="dropdown-item rounded-2 py-2" href="${prefix}dashboard"><i class="bi bi-grid-fill me-2 text-primary"></i>Dashboard</a></li>
                        ${isUserDoctor ? `
                            <li><a class="dropdown-item rounded-2 py-2 fw-bold text-success bg-success-subtle mb-1" href="${prefix}doctor/"><i class="bi bi-hospital me-2"></i>Doctor Console</a></li>
                        ` : ''}
                        ${isUserAdmin ? `
                            <li><a class="dropdown-item rounded-2 py-2 fw-bold text-primary bg-primary-subtle mb-1" href="${prefix}admin/"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</a></li>
                        ` : ''}
                        <li><a class="dropdown-item rounded-2 py-2" href="${prefix}appointment/appointments"><i class="bi bi-calendar2-check me-2 text-primary"></i>My Appointments</a></li>
                        <li><hr class="dropdown-divider my-1"></li>
                        <li>
                            <button id="logoutBtn" class="dropdown-item rounded-2 py-2 text-danger d-flex align-items-center gap-2" type="button">
                                <i class="bi bi-box-arrow-right"></i> Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        `;

        // Direct click toggle for bulletproof dropdown activation across all devices
        const userBtn = document.getElementById('userNavDropdown');
        const userWrapper = document.getElementById('userDropdownWrapper');
        const userMenu = userWrapper?.querySelector('.dropdown-menu');

        if (userBtn && userWrapper && userMenu) {
            const toggleUserDropdown = (forceState) => {
                const isCurrentlyOpen = userWrapper.classList.contains('show') || userMenu.classList.contains('show');
                const shouldOpen = forceState !== undefined ? forceState : !isCurrentlyOpen;

                if (shouldOpen) {
                    userWrapper.classList.add('show');
                    userMenu.classList.add('show');
                    userBtn.setAttribute('aria-expanded', 'true');
                    userBtn.classList.add('show');

                    // On mobile (< 992px), enforce direct styles so no external rule or cache can ever suppress it
                    if (window.innerWidth < 992) {
                        userMenu.style.setProperty('display', 'block', 'important');
                        userMenu.style.setProperty('visibility', 'visible', 'important');
                        userMenu.style.setProperty('opacity', '1', 'important');
                        userMenu.style.setProperty('pointer-events', 'auto', 'important');
                        userMenu.style.setProperty('transform', 'none', 'important');
                        userMenu.style.setProperty('position', 'static', 'important');
                        userMenu.style.setProperty('float', 'none', 'important');
                        userMenu.style.setProperty('width', '100%', 'important');
                    }
                } else {
                    userWrapper.classList.remove('show', 'hover-open');
                    userMenu.classList.remove('show');
                    userBtn.setAttribute('aria-expanded', 'false');
                    userBtn.classList.remove('show');

                    if (window.innerWidth < 992) {
                        userMenu.style.setProperty('display', 'none', 'important');
                        userMenu.style.removeProperty('visibility');
                        userMenu.style.removeProperty('opacity');
                        userMenu.style.removeProperty('pointer-events');
                        userMenu.style.removeProperty('transform');
                        userMenu.style.removeProperty('position');
                        userMenu.style.removeProperty('float');
                        userMenu.style.removeProperty('width');
                    }
                }
            };

            userBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleUserDropdown();
            });

            document.addEventListener('click', (e) => {
                if (!userWrapper.contains(e.target)) {
                    toggleUserDropdown(false);
                }
            });
        }

        document.getElementById('logoutBtn')?.addEventListener('click', logout);
        if (typeof initNavbarHover === 'function') {
            setTimeout(initNavbarHover, 50);
        }
    } else {
        authContainer.innerHTML = `
            <div class="d-flex align-items-center gap-2 flex-shrink-0 text-nowrap auth-logged-out-buttons">
                <a href="${prefix}login" class="secondary-button btn-sm px-3 py-1 text-nowrap" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em;">
                    <i class="bi bi-box-arrow-in-right"></i> SIGN IN
                </a>
                <a href="${prefix}appointment/book" class="primary-button btn-sm px-3 py-1 text-nowrap" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em;">
                    BOOK VISIT <i class="bi bi-arrow-right"></i>
                </a>
            </div>
        `;
    }
};

/**
 * Route protection guard for private pages
 */
const requireAuth = () => {
    const user = getCurrentUser();
    if (!user || !getToken()) {
        const prefix = getPrefix();
        window.location.href = `${prefix}login?redirect=1`;
        return false;
    }
    return true;
};

/**
 * Automatically open dropdown menus when cursor hovers over navbar items on desktop,
 * enforcing strict mutual exclusivity so multiple dropdown menus NEVER overlap or clash.
 */
const closeAllNavbarDropdowns = (exceptItem = null) => {
    document.querySelectorAll('.navbar .nav-item.dropdown, .navbar .dropdown').forEach((other) => {
        if (other === exceptItem) return;
        other.classList.remove('hover-open', 'show');
        if (other._closeTimer) {
            clearTimeout(other._closeTimer);
            other._closeTimer = null;
        }
        const otherToggle = other.querySelector('.dropdown-toggle');
        if (otherToggle) {
            otherToggle.setAttribute('aria-expanded', 'false');
            otherToggle.classList.remove('show');
            try {
                if (window.bootstrap && window.bootstrap.Dropdown) {
                    const bsDropdown = window.bootstrap.Dropdown.getInstance(otherToggle);
                    if (bsDropdown) bsDropdown.hide();
                }
            } catch (e) {}
        }
        const otherMenu = other.querySelector('.dropdown-menu');
        if (otherMenu) {
            otherMenu.classList.remove('show');
        }
    });
};

const initNavbarHover = () => {
    const isDesktop = () => window.innerWidth >= 992;

    const setupDropdowns = () => {
        document.querySelectorAll('.navbar .nav-item.dropdown, .navbar .dropdown').forEach((item) => {
            if (item.dataset.curemedHoverInit === 'true') return;
            item.dataset.curemedHoverInit = 'true';

            const toggle = item.querySelector('.dropdown-toggle');
            const menu = item.querySelector('.dropdown-menu');
            if (!toggle || !menu) return;

            const openMenu = () => {
                if (!isDesktop()) return;
                // Close all other dropdowns immediately so they never overlap
                closeAllNavbarDropdowns(item);
                if (item._closeTimer) {
                    clearTimeout(item._closeTimer);
                    item._closeTimer = null;
                }
                item.classList.add('hover-open');
                toggle.setAttribute('aria-expanded', 'true');
            };

            const closeMenu = () => {
                if (!isDesktop()) return;
                if (item._closeTimer) clearTimeout(item._closeTimer);
                item._closeTimer = setTimeout(() => {
                    item.classList.remove('hover-open', 'show');
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.classList.remove('show');
                    menu.classList.remove('show');
                    item._closeTimer = null;
                }, 100);
            };

            item.addEventListener('mouseenter', openMenu);
            item.addEventListener('mouseleave', closeMenu);

            toggle.addEventListener('click', (e) => {
                if (isDesktop()) {
                    const isOpen = item.classList.contains('hover-open') || item.classList.contains('show') || menu.classList.contains('show');
                    closeAllNavbarDropdowns(item);
                    if (isOpen) {
                        item.classList.remove('hover-open', 'show');
                        toggle.setAttribute('aria-expanded', 'false');
                        toggle.classList.remove('show');
                        menu.classList.remove('show');
                    } else {
                        item.classList.add('hover-open');
                        toggle.setAttribute('aria-expanded', 'true');
                    }
                    if (toggle.getAttribute('href') === '#' || !toggle.getAttribute('href')) {
                        e.preventDefault();
                    }
                }
            });

            menu.querySelectorAll('.dropdown-item').forEach(dropdownItem => {
                dropdownItem.addEventListener('click', () => {
                    closeAllNavbarDropdowns();
                });
            });
        });
    };

    if (!document._navbarGlobalClickBound) {
        document._navbarGlobalClickBound = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar .dropdown, .navbar .nav-item.dropdown')) {
                closeAllNavbarDropdowns();
            }
        });
    }

    setupDropdowns();
    setTimeout(setupDropdowns, 150);
};

// Initialize navbar state and live sync on DOM load
document.addEventListener('DOMContentLoaded', () => {
    renderNavbarAuth();
    initNavbarHover();
    if (getToken()) {
        syncCurrentUser(true);
        startLiveSyncPolling();
    }
});

/**
 * In-Website Custom Confirmation Modal (Replaces native browser confirm())
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
const showConfirmDialog = ({
    title = 'Confirm Removal',
    message = 'Are you sure you want to proceed?',
    subtext = 'This action cannot be undone.',
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel',
    confirmBtnClass = 'btn-danger',
    icon = 'bi-trash3-fill',
    iconColor = 'text-danger',
    iconBg = 'bg-danger-subtle'
} = {}) => {
    return new Promise((resolve) => {
        let modalEl = document.getElementById('inWebsiteConfirmModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'inWebsiteConfirmModal';
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.style.zIndex = '106000';
            modalEl.innerHTML = `
                <div class="modal-dialog modal-dialog-centered" style="max-width: 430px;">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden text-center p-2" style="background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(12px); box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25) !important;">
                        <div class="modal-body p-4">
                            <div class="d-inline-flex p-3 rounded-circle mb-3 shadow-sm" id="confirmModalIconBox" style="width: 72px; height: 72px; align-items: center; justify-content: center;">
                                <i class="bi fs-1" id="confirmModalIcon"></i>
                            </div>
                            <h5 class="fw-bold text-dark mb-2" id="confirmModalTitle">Are you sure?</h5>
                            <p class="text-dark fw-medium mb-1 px-2" id="confirmModalMessage" style="font-size: 0.95rem;"></p>
                            <small class="text-muted d-block mb-4" id="confirmModalSubtext" style="font-size: 0.8rem;"></small>
                            <div class="d-flex align-items-center justify-content-center gap-2">
                                <button type="button" class="btn btn-light border rounded-pill px-4 py-2 fw-semibold text-secondary" id="confirmModalCancelBtn" data-bs-dismiss="modal">
                                    Cancel
                                </button>
                                <button type="button" class="btn rounded-pill px-4 py-2 fw-bold shadow-sm" id="confirmModalConfirmBtn">
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalEl);
        }

        const titleEl = document.getElementById('confirmModalTitle');
        const msgEl = document.getElementById('confirmModalMessage');
        const subtextEl = document.getElementById('confirmModalSubtext');
        const iconBox = document.getElementById('confirmModalIconBox');
        const iconEl = document.getElementById('confirmModalIcon');
        const cancelBtn = document.getElementById('confirmModalCancelBtn');
        const confirmBtn = document.getElementById('confirmModalConfirmBtn');

        titleEl.textContent = title;
        msgEl.textContent = message;
        subtextEl.textContent = subtext || '';
        cancelBtn.textContent = cancelText;
        confirmBtn.textContent = confirmText;

        iconBox.className = `d-inline-flex p-3 rounded-circle mb-3 shadow-sm ${iconBg} ${iconColor}`;
        iconEl.className = `bi ${icon} fs-1`;
        confirmBtn.className = `btn ${confirmBtnClass} rounded-pill px-4 py-2 fw-bold shadow-sm`;

        let bsModal = null;
        if (window.bootstrap && window.bootstrap.Modal) {
            bsModal = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: true });
        }

        if (!bsModal) {
            const confirmed = window.confirm(message + (subtext ? ('\n' + subtext) : ''));
            resolve(confirmed);
            return;
        }

        let settled = false;

        const handleConfirm = () => {
            if (!settled) {
                settled = true;
                modalEl.removeEventListener('hidden.bs.modal', handleCancel);
                bsModal.hide();
                resolve(true);
            }
        };

        const handleCancel = () => {
            if (!settled) {
                settled = true;
                resolve(false);
            }
        };

        const freshConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(freshConfirmBtn, confirmBtn);
        freshConfirmBtn.addEventListener('click', handleConfirm);

        modalEl.addEventListener('hidden.bs.modal', handleCancel, { once: true });
        bsModal.show();
    });
};

/**
 * In-Website Custom Toast Notification (Replaces native browser alert())
 * @param {string} message
 * @param {string} type
 */
const showToast = (message, type = 'success') => {
    let toastContainer = document.getElementById('globalToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'globalToastContainer';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '110000';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast_' + Date.now();
    const isSuccess = type === 'success';
    const bgClass = isSuccess ? 'bg-dark' : (type === 'danger' ? 'bg-danger text-white' : 'bg-dark');
    const iconClass = isSuccess ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-warning';

    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = `toast align-items-center text-white ${bgClass} border-0 shadow-lg rounded-4 mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2 py-3 px-3">
                <i class="bi ${iconClass} fs-5"></i>
                <span class="fw-semibold">${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
};

// Expose globally
window.showConfirmDialog = showConfirmDialog;
window.showToast = showToast;

// Global override: intercept any native alert() and render sleek in-website toast
window.alert = function (message) {
    if (typeof showToast === 'function') {
        showToast(message, 'warning');
    } else {
        console.warn('Native alert intercepted:', message);
    }
};

// Expose Auth module globally
window.Auth = {
    getToken,
    getCurrentUser,
    login: setAuthSession,
    logout,
    apiFetch,
    requireAuth,
    requireAdmin,
    requireDoctor,
    isAdmin,
    isDoctor,
    syncCurrentUser,
    broadcastRoleChange,
    showConfirmDialog,
    showToast,
    renderNavbarAuth,
    initNavbarHover
};

// ============================================================================
// Global Multi-Page Animation & Micro-Interaction Engine
// Automatically activates scroll progress, scroll reveals, and counters on all pages
// ============================================================================
const initGlobalPageAnimations = () => {
    // 1. Injected Top Scroll Progress Bar
    if (!document.getElementById('globalScrollProgress') && !document.getElementById('scrollProgressBar')) {
        const bar = document.createElement('div');
        bar.id = 'globalScrollProgress';
        bar.className = 'global-scroll-progress';
        document.body.prepend(bar);

        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
            bar.style.width = scrolled + '%';
        }, { passive: true });
    }

    // 2. Universal Number Counter Animation Helper
    const animateCounter = (el, target, duration = 850) => {
        if (!el || isNaN(target)) return;
        const start = 0;
        const startTime = performance.now();
        const update = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * ease);
            el.textContent = current.toLocaleString();
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = target.toLocaleString();
            }
        };
        requestAnimationFrame(update);
    };

    window.animateNumberCounter = animateCounter;

    // Observe dashboard / admin stat numbers when updated dynamically
    const statIds = ['statAppointments', 'statDonors', 'statMedicines', 'statWellness', 'statRecords', 'statDoctors'];
    statIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const observer = new MutationObserver(() => {
            const val = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(val) && val > 0 && !el._isCounting) {
                el._isCounting = true;
                animateCounter(el, val, 900);
                setTimeout(() => { el._isCounting = false; }, 950);
            }
        });
        observer.observe(el, { childList: true, characterData: true, subtree: true });
    });

    // 4. Universal Intersection Observer for Scroll Reveals
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

        const targets = document.querySelectorAll('.card, .table-responsive, .dashboard-card, .donor-card, .medicine-card, .record-card, .wellness-card, .doctor-adm-card, .reveal-on-scroll');
        targets.forEach(el => {
            if (!el.classList.contains('reveal-on-scroll')) {
                el.classList.add('reveal-on-scroll');
            }
            observer.observe(el);
        });
    }

    // 5. Global Back-to-Top Floating Button
    if (!document.getElementById('globalBackToTop') && !document.querySelector('.back-to-top-btn')) {
        const topBtn = document.createElement('button');
        topBtn.id = 'globalBackToTop';
        topBtn.className = 'back-to-top-btn';
        topBtn.setAttribute('type', 'button');
        topBtn.setAttribute('aria-label', 'Back to top');
        topBtn.innerHTML = `
            <svg class="progress-ring" width="46" height="46">
                <circle class="progress-ring__circle" stroke="#2563eb" stroke-width="2.5" fill="transparent" r="20" cx="23" cy="23" stroke-dasharray="125.6" stroke-dashoffset="125.6"/>
            </svg>
            <i class="bi bi-arrow-up"></i>
        `;
        document.body.appendChild(topBtn);

        const circle = topBtn.querySelector('.progress-ring__circle');
        const radius = 20;
        const circumference = 2 * Math.PI * radius;

        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const nav = document.querySelector('.navbar');
            if (nav) {
                if (winScroll > 18) nav.classList.add('navbar-scrolled');
                else nav.classList.remove('navbar-scrolled');
            }

            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (winScroll > 280) {
                topBtn.classList.add('is-active');
                if (height > 0) {
                    const scrolled = winScroll / height;
                    const offset = circumference - scrolled * circumference;
                    if (circle) circle.style.strokeDashoffset = offset;
                }
            } else {
                topBtn.classList.remove('is-active');
            }
        }, { passive: true });

        topBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalPageAnimations);
} else {
    initGlobalPageAnimations();
}

// Auto-collapse mobile navbar when clicking non-dropdown nav links or dropdown items
document.addEventListener('click', (e) => {
    const mainNav = document.getElementById('mainNavbar');
    if (!mainNav || !mainNav.classList.contains('show')) return;

    // Never collapse when interacting with dropdown toggles or user dropdown wrapper
    if (e.target.closest('#userNavDropdown, #userDropdownWrapper, .dropdown-toggle')) return;

    const clickedItem = e.target.closest('.navbar-nav .nav-link:not(.dropdown-toggle), .navbar .dropdown-item');
    if (clickedItem) {
        try {
            if (window.bootstrap && window.bootstrap.Collapse) {
                const bsCollapse = window.bootstrap.Collapse.getInstance(mainNav) || new window.bootstrap.Collapse(mainNav, { toggle: false });
                bsCollapse.hide();
            } else {
                mainNav.classList.remove('show');
            }
        } catch (err) {
            mainNav.classList.remove('show');
        }
    }
});



