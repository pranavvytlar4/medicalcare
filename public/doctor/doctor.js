/**
 * ============================================================================
 * Doctor Clinical Portal Controller (doctor.js)
 * Real-time queue, 1-Click Acceptance, Reminder Dispatcher & Day-Picker Prescribing
 * ============================================================================
 */

(function () {
    'use strict';

    // State Container
    const state = {
        appointments: [],
        filteredAppointments: [],
        activeStatusFilter: 'All',
        activeDateFilter: 'all',
        searchQuery: '',
        activeTab: 'dashboard',
        currentDoctor: null,
        modalDayPicker: null,
        quickDayPicker: null,
        selectedModalDays: ['Mon', 'Wed', 'Fri'],
        selectedQuickDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    };

    // DOM Elements
    let tableBody;
    let toastEl;
    let toastInstance;

    // Toast helper
    function showToast(message, isSuccess = true) {
        if (!toastInstance) {
            toastEl = document.getElementById('doctorToast');
            if (toastEl) toastInstance = new bootstrap.Toast(toastEl, { delay: 4000 });
        }
        const body = document.getElementById('doctorToastBody');
        if (body) {
            body.innerHTML = `
                <i class="bi ${isSuccess ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} fs-5"></i>
                <span class="fw-semibold">${message}</span>
            `;
        }
        if (toastInstance) toastInstance.show();
    }

    // Format relative time helper
    function getRelativeSchedule(dateStr, timeStr) {
        if (!dateStr) return { label: 'Scheduled', badge: 'bg-light text-dark' };
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomY = tomorrowDate.getFullYear();
        const tomM = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
        const tomD = String(tomorrowDate.getDate()).padStart(2, '0');
        const tomStr = `${tomY}-${tomM}-${tomD}`;

        if (dateStr === todayStr) {
            return { label: `Today at ${timeStr || ''}`, badge: 'bg-danger text-white' };
        } else if (dateStr === tomStr) {
            return { label: `Tomorrow at ${timeStr || ''}`, badge: 'bg-primary text-white' };
        } else if (dateStr < todayStr) {
            return { label: `${dateStr} (${timeStr || ''})`, badge: 'bg-secondary text-white' };
        } else {
            return { label: `${dateStr} at ${timeStr || ''}`, badge: 'bg-info-subtle text-info-emphasis' };
        }
    }

    // Format date string to readable format
    function formatReadableDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parts[0], parts[1] - 1, parts[2]);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    }

    // Format time display
    function updateLiveClock() {
        const clockEl = document.getElementById('liveClockDisplay');
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }

    // Initialize Doctor Header Info
    async function setupDoctorHeader() {
        const user = window.Auth.getCurrentUser();
        if (!user) return;

        state.currentDoctor = user;
        const nameEl = document.getElementById('doctorFullName');
        const avatarEl = document.getElementById('doctorAvatarImg');
        const topbarName = document.getElementById('topbarDoctorName');
        const topbarInitials = document.getElementById('topbarDoctorInitials');
        const welcomeName = document.getElementById('doctorWelcomeName');

        const cleanName = (user.name || '').replace(/^Dr\.\s*/i, '').trim();
        const docTitleName = (user.name || '').startsWith('Dr.') ? user.name : `Dr. ${user.name}`;
        if (nameEl) nameEl.textContent = docTitleName;
        if (topbarName) topbarName.textContent = docTitleName;
        if (welcomeName) welcomeName.textContent = cleanName || 'Doctor';
        
        const avatarLetterEl = document.getElementById('doctorAvatarLetter');
        if (avatarLetterEl) {
            if (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/uploads') || user.avatar.startsWith('data:'))) {
                avatarLetterEl.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarLetterEl.textContent = cleanName.charAt(0).toUpperCase() || 'P';
            }
        }
        if (topbarInitials) {
            const parts = cleanName.split(' ');
            topbarInitials.textContent = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'DR';
        }
        
        // Pick an avatar based on name or user avatar
        const lowerName = (user.name || '').toLowerCase();
        if (avatarEl) {
            if (user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('/uploads') || user.avatar.startsWith('data:'))) {
                avatarEl.src = user.avatar;
            } else if (lowerName.includes('priya') || lowerName.includes('sarah') || lowerName.includes('ananya') || lowerName.includes('aisha')) {
                avatarEl.src = '../images/dr-sarah-johnson.jpg';
            } else if (lowerName.includes('rajesh') || lowerName.includes('robert')) {
                avatarEl.src = '../images/dr-robert-miller.jpg';
            } else if (lowerName.includes('rodrigues') || lowerName.includes('tiago')) {
                avatarEl.src = '../images/dr-rodrigues.jpg';
            } else {
                avatarEl.src = '../images/male-doctor.jpg';
            }
        }

        // Active Nav item highlight based on pathname
        const pathname = window.location.pathname.toLowerCase();
        const navDash = document.getElementById('navItemDashboard');
        const navApts = document.getElementById('navItemAppointments');
        const navRem = document.getElementById('navItemReminders');

        if (pathname.includes('appointments.html')) {
            navDash?.classList.remove('active');
            navApts?.classList.add('active');
            navRem?.classList.remove('active');
        } else if (pathname.includes('reminders.html')) {
            navDash?.classList.remove('active');
            navApts?.classList.remove('active');
            navRem?.classList.add('active');
        } else {
            navDash?.classList.add('active');
            navApts?.classList.remove('active');
            navRem?.classList.remove('active');
        }

        // Live check doctor details from API
        try {
            const { response, data } = await window.Auth.apiFetch('/api/doctors/profile/me');
            if (response.ok && data.success && data.data) {
                const doc = data.data;
                const hospEl = document.getElementById('doctorHospitalName');
                if (hospEl && doc.specialization) {
                    hospEl.textContent = `${doc.specialization} • ${doc.hospital || 'AIIMS New Delhi'}`;
                }
                if (doc.name && welcomeName) {
                    const cName = doc.name.replace(/^Dr\.\s*/i, '').trim();
                    welcomeName.textContent = cName || 'Doctor';
                }
                if (doc.name && nameEl) {
                    nameEl.textContent = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                }
                if (doc.image && avatarLetterEl && (doc.image.startsWith('http') || doc.image.startsWith('/uploads') || doc.image.startsWith('data:'))) {
                    avatarLetterEl.innerHTML = `<img src="${doc.image}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }

                // If phone or experience is missing, automatically prompt doctor to complete profile
                const hasPhone = doc.phone && doc.phone.trim() && doc.phone !== 'Not specified';
                const hasExp = doc.experience && doc.experience.trim();
                const hasCustomPhoto = doc.image && !doc.image.includes('male-doctor.jpg');
                if ((!hasPhone || !hasExp || !hasCustomPhoto) && !sessionStorage.getItem('doctor_profile_onboarding_shown')) {
                    sessionStorage.setItem('doctor_profile_onboarding_shown', '1');
                    setTimeout(() => {
                        window.openDoctorSelfProfileModal();
                    }, 600);
                }
            }
        } catch (e) {
            console.warn('Doctor profile check:', e);
        }
    }

    // Fetch All Appointments
    async function loadAppointments() {
        tableBody = document.getElementById('appointmentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="text-muted mt-2 mb-0">Syncing clinic queue...</p>
                    </td>
                </tr>
            `;
        }

        try {
            const { response, data } = await window.Auth.apiFetch('/api/appointments');
            if (response.ok && data && Array.isArray(data.data)) {
                state.appointments = data.data;
            } else {
                state.appointments = [];
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            showToast('Unable to reach appointment server. Showing cached queue.', false);
        }

        updateKPICounters();
        renderDashboardRecent();
        applyFiltersAndRender();
        populatePatientDropdowns();
        renderRemindersTabContent();
    }

    // Update KPI Metric Counters
    function updateKPICounters() {
        const apts = state.appointments;
        const pending = apts.filter(a => (a.status || 'Pending').toLowerCase() === 'pending').length;
        const confirmed = apts.filter(a => (a.status || '').toLowerCase() === 'confirmed').length;
        const completed = apts.filter(a => (a.status || '').toLowerCase() === 'completed').length;
        const reminders = apts.filter(a => a.reminderSent === true).length;
        const cancelled = apts.filter(a => (a.status || '').toLowerCase() === 'cancelled').length;
        const total = apts.length;

        const countPending = document.getElementById('countPending');
        if (countPending) countPending.textContent = pending;
        const countConfirmed = document.getElementById('countConfirmed');
        if (countConfirmed) countConfirmed.textContent = confirmed;
        const countCompleted = document.getElementById('countCompleted');
        if (countCompleted) countCompleted.textContent = completed;
        const countReminders = document.getElementById('countReminders');
        if (countReminders) countReminders.textContent = reminders;
        const countCancelled = document.getElementById('countCancelled');
        if (countCancelled) countCancelled.textContent = cancelled;
        const countTotal = document.getElementById('countTotal');
        if (countTotal) countTotal.textContent = total;

        // Breakdown card numbers (identical to Admin panel Consultation Appointments Breakdown)
        const statConf = document.getElementById('statConfirmedApts');
        if (statConf) statConf.textContent = confirmed;
        const statPend = document.getElementById('statPendingApts');
        if (statPend) statPend.textContent = pending;
        const statComp = document.getElementById('statCompletedApts');
        if (statComp) statComp.textContent = completed;
        const statCanc = document.getElementById('statCancelledApts');
        if (statCanc) statCanc.textContent = cancelled;

        // Filter button counts
        const fAll = document.getElementById('filterCountAll');
        if (fAll) fAll.textContent = total;
        const fPend = document.getElementById('filterCountPending');
        if (fPend) fPend.textContent = pending;
        const fConf = document.getElementById('filterCountConfirmed');
        if (fConf) fConf.textContent = confirmed;
        const fComp = document.getElementById('filterCountCompleted');
        if (fComp) fComp.textContent = completed;
        const fCanc = document.getElementById('filterCountCancelled');
        if (fCanc) fCanc.textContent = cancelled;

        const navTotal = document.getElementById('navTotalCount');
        if (navTotal) navTotal.textContent = total;
        const navRem = document.getElementById('navRemindersCount');
        if (navRem) navRem.textContent = reminders;

        const sbPending = document.getElementById('sidebarPendingCount');
        if (sbPending) sbPending.textContent = pending;
        const sbConfirmed = document.getElementById('sidebarConfirmedCount');
        if (sbConfirmed) sbConfirmed.textContent = confirmed;
        const sbCompleted = document.getElementById('sidebarCompletedCount');
        if (sbCompleted) sbCompleted.textContent = completed;
        const sbCancelled = document.getElementById('sidebarCancelledCount');
        if (sbCancelled) sbCancelled.textContent = cancelled;
    }

    // Render Top 5 Recent Consultations on the Dashboard Tab
    function renderDashboardRecent() {
        const recentBody = document.getElementById('dashboardRecentTableBody');
        if (!recentBody) return;

        const list = state.appointments.slice(0, 5);
        if (list.length === 0) {
            recentBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="bi bi-calendar2-heart text-secondary fs-4 d-block mb-1"></i>
                        No patient consultations in queue yet.
                    </td>
                </tr>
            `;
            return;
        }

        recentBody.innerHTML = list.map((apt, index) => {
            const p = apt.patient || {};
            const patientName = p.name || 'Walk-in Patient';
            const patientEmail = p.email || 'No email';
            const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';

            const aptDate = apt.appointmentDate || apt.date || '';
            const aptTime = apt.appointmentTime || apt.time || '10:00 AM';
            const relative = getRelativeSchedule(aptDate, aptTime);
            const reason = apt.reason || apt.notes || 'General consultation';

            const status = apt.status || 'Pending';
            let statusBadge = '';
            if (status === 'Pending') {
                statusBadge = `<span class="badge-status-pending"><i class="bi bi-clock-history"></i> Pending</span>`;
            } else if (status === 'Confirmed') {
                statusBadge = `<span class="badge-status-confirmed"><i class="bi bi-check-circle-fill"></i> Confirmed</span>`;
            } else if (status === 'Completed') {
                statusBadge = `<span class="badge-status-completed"><i class="bi bi-patch-check-fill"></i> Completed</span>`;
            } else {
                statusBadge = `<span class="badge-status-cancelled"><i class="bi bi-x-circle-fill"></i> Cancelled</span>`;
            }

            let actionBtn = '';
            if (status === 'Pending') {
                actionBtn = `
                    <button class="btn btn-sm btn-outline-success rounded-pill px-2 py-1 fw-bold" onclick="openAcceptAptModal('${apt._id}')" title="Accept Visit">
                        <i class="bi bi-check2"></i> Accept
                    </button>
                `;
            } else if (status === 'Confirmed') {
                actionBtn = `
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-2 py-1 fw-bold" onclick="openCompleteAptModal('${apt._id}')" title="Mark Done">
                        <i class="bi bi-heart-pulse"></i> Done
                    </button>
                `;
            } else {
                actionBtn = `
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1" onclick="switchNavTab('appointments')" title="View in Queue">
                        View
                    </button>
                `;
            }

            return `
                <tr>
                    <td class="fw-bold text-muted small">${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="patient-avatar">${initials}</div>
                            <div>
                                <div class="fw-bold text-dark">${patientName}</div>
                                <div class="small text-muted">${patientEmail}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${relative.badge} rounded-pill px-2 py-1 mb-1 small">${relative.label}</span>
                        <div class="small text-muted">${formatReadableDate(aptDate)}</div>
                    </td>
                    <td>
                        <div class="text-dark small fw-semibold" style="max-width: 240px; word-break: break-word;">${reason}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td class="text-end">${actionBtn}</td>
                </tr>
            `;
        }).join('');
    }

    // Apply Filter Criteria and Render Table
    function applyFiltersAndRender() {
        tableBody = document.getElementById('appointmentsTableBody');
        if (!tableBody) return;

        let list = [...state.appointments];

        // 1. Status Filter
        if (state.activeStatusFilter !== 'All') {
            list = list.filter(a => (a.status || 'Pending').toLowerCase() === state.activeStatusFilter.toLowerCase());
        }

        // 2. Date Filter
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomStr = tomorrowDate.toISOString().split('T')[0];

        if (state.activeDateFilter === 'today') {
            list = list.filter(a => (a.appointmentDate || a.date) === todayStr);
        } else if (state.activeDateFilter === 'tomorrow') {
            list = list.filter(a => (a.appointmentDate || a.date) === tomStr);
        } else if (state.activeDateFilter === 'upcoming') {
            list = list.filter(a => (a.appointmentDate || a.date) >= todayStr);
        }

        // 3. Search Query
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase().trim();
            list = list.filter(a => {
                const pName = (a.patient?.name || '').toLowerCase();
                const pEmail = (a.patient?.email || '').toLowerCase();
                const pPhone = (a.patient?.phone || '').toLowerCase();
                const reason = (a.reason || a.notes || '').toLowerCase();
                const date = (a.appointmentDate || a.date || '').toLowerCase();
                return pName.includes(q) || pEmail.includes(q) || pPhone.includes(q) || reason.includes(q) || date.includes(q);
            });
        }

        state.filteredAppointments = list;

        if (list.length === 0) {
            const hasFilter = state.activeStatusFilter !== 'All' || state.activeDateFilter !== 'all' || (state.searchQuery && state.searchQuery.trim() !== '');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-0">
                        <div class="doctor-empty-state">
                            <div class="empty-icon-circle shadow-sm">
                                <i class="bi bi-calendar2-heart"></i>
                            </div>
                            <h5 class="fw-bold text-dark mb-2">${hasFilter ? 'No matching appointments found' : 'No appointments scheduled yet'}</h5>
                            <p class="text-muted small mb-3 mx-auto" style="max-width: 440px;">
                                ${hasFilter 
                                    ? 'No patients match your search or filter tags. Try clearing the filter.' 
                                    : 'When patients book visits online or register at the clinic, they will show up here.'}
                            </p>
                            <div class="d-flex align-items-center justify-content-center gap-2">
                                ${hasFilter ? `
                                    <button class="btn btn-outline-secondary rounded-pill btn-sm px-3 fw-bold" onclick="resetFilters()">
                                        <i class="bi bi-x-circle me-1"></i> Clear Filter
                                    </button>
                                ` : `
                                    <button class="btn btn-outline-primary rounded-pill btn-sm px-3 fw-bold" onclick="fetchDoctorAppointments()">
                                        <i class="bi bi-arrow-repeat me-1"></i> Refresh Queue
                                    </button>
                                `}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Render Rows
        tableBody.innerHTML = list.map((apt, index) => {
            const p = apt.patient || {};
            const patientName = p.name || 'Walk-in Patient';
            const patientEmail = p.email || 'No email';
            const patientPhone = p.phone || 'N/A';
            const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'P';

            const aptDate = apt.appointmentDate || apt.date || '';
            const aptTime = apt.appointmentTime || apt.time || '10:00 AM';
            const relative = getRelativeSchedule(aptDate, aptTime);
            const reason = apt.reason || apt.notes || 'General medical review';

            const status = apt.status || 'Pending';
            let statusBadge = '';
            if (status === 'Pending') {
                statusBadge = `<span class="badge-status-pending"><i class="bi bi-clock-history"></i> Pending</span>`;
            } else if (status === 'Confirmed') {
                statusBadge = `<span class="badge-status-confirmed"><i class="bi bi-check-circle-fill"></i> Confirmed</span>`;
            } else if (status === 'Completed') {
                statusBadge = `<span class="badge-status-completed"><i class="bi bi-patch-check-fill"></i> Completed</span>`;
            } else {
                statusBadge = `<span class="badge-status-cancelled"><i class="bi bi-x-circle-fill"></i> Cancelled</span>`;
            }

            // Reminder status badge
            let reminderBadge = '';
            if (apt.reminderSent) {
                const noteTooltip = (apt.reminderNotes || 'Reminder sent').replace(/"/g, '&quot;');
                reminderBadge = `
                    <span class="badge-reminder-sent" title="${noteTooltip}">
                        <i class="bi bi-bell-fill"></i> Sent
                    </span>
                `;
            } else {
                reminderBadge = `
                    <span class="badge-reminder-none">
                        <i class="bi bi-bell-slash"></i> Not Sent
                    </span>
                `;
            }

            // Action Buttons
            let actionButtons = '';
            if (status === 'Pending') {
                actionButtons = `
                    <div class="d-flex align-items-center justify-content-end gap-1 flex-wrap">
                        <button class="btn-accept-apt" onclick="openAcceptAptModal('${apt._id}')" title="Accept Visit">
                            <i class="bi bi-check2"></i> Accept
                        </button>
                        <button class="btn btn-outline-danger btn-sm rounded-pill px-2 py-1" onclick="openCancelAptModal('${apt._id}')" title="Decline Visit">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                `;
            } else if (status === 'Confirmed') {
                actionButtons = `
                    <div class="d-flex align-items-center justify-content-end gap-1 flex-wrap">
                        <button class="btn-remind-apt" onclick="openSendReminderModal('${apt._id}')" title="Send Reminder">
                            <i class="bi bi-bell"></i> Remind
                        </button>
                        <button class="btn-prescribe-apt" onclick="openPrescribeMedModal('${apt._id}')" title="Add Medicine Schedule">
                            <i class="bi bi-capsule"></i> Prescribe
                        </button>
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-2 py-1 fw-bold" onclick="openCompleteAptModal('${apt._id}')" title="Mark Done">
                            <i class="bi bi-heart-pulse"></i> Done
                        </button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill px-2 py-1" onclick="openCancelAptModal('${apt._id}')" title="Cancel Visit">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                `;
            } else if (status === 'Completed') {
                actionButtons = `
                    <div class="d-flex align-items-center justify-content-end gap-1 flex-wrap">
                        <button class="btn-prescribe-apt" onclick="openPrescribeMedModal('${apt._id}')" title="Add Medicine Schedule">
                            <i class="bi bi-capsule"></i> Prescribe
                        </button>
                        <span class="badge bg-light text-muted rounded-pill px-2 py-1 small">Finished</span>
                    </div>
                `;
            } else {
                actionButtons = `<span class="badge bg-light text-secondary rounded-pill px-2 py-1 small">Cancelled</span>`;
            }

            return `
                <tr>
                    <td class="fw-bold text-muted small">${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="patient-avatar">${initials}</div>
                            <div>
                                <div class="fw-bold text-dark">${patientName}</div>
                                <div class="small text-muted">
                                    <a href="mailto:${patientEmail}" class="text-decoration-none text-muted">${patientEmail}</a> &bull; 
                                    <a href="tel:${patientPhone}" class="text-decoration-none text-muted">${patientPhone}</a>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${relative.badge} rounded-pill px-2 py-1 mb-1 small">${relative.label}</span>
                        <div class="small text-muted">${formatReadableDate(aptDate)}</div>
                    </td>
                    <td>
                        <div class="text-dark small fw-semibold" style="max-width: 240px; word-break: break-word;">${reason}</div>
                        ${apt.doctorNotes ? `<div class="small text-primary mt-1 fst-italic"><i class="bi bi-chat-left-quote me-1"></i>${apt.doctorNotes}</div>` : ''}
                    </td>
                    <td>${statusBadge}</td>
                    <td>${reminderBadge}</td>
                    <td class="text-end">${actionButtons}</td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // ACTION 1: ACCEPT APPOINTMENT
    // ==========================================
    window.openAcceptAptModal = function (aptId) {
        const apt = state.appointments.find(a => a._id === aptId);
        if (!apt) return;

        const p = apt.patient || {};
        document.getElementById('acceptAptId').value = aptId;
        document.getElementById('acceptPatientName').textContent = p.name || 'Patient';
        document.getElementById('acceptPatientContact').textContent = `${p.email || 'No email'} • ${p.phone || 'No phone'}`;
        document.getElementById('acceptPatientInitials').textContent = (p.name || 'P').charAt(0).toUpperCase();
        document.getElementById('acceptAptSlot').textContent = `${formatReadableDate(apt.appointmentDate || apt.date)} at ${apt.appointmentTime || apt.time || '10:00 AM'}`;
        document.getElementById('acceptAptReason').textContent = apt.reason || apt.notes || 'General consultation';
        document.getElementById('acceptDoctorNotes').value = 'Appointment confirmed! Please arrive 10 minutes before your slot and bring your previous reports.';
        document.getElementById('acceptSendReminderCheck').checked = true;

        const modal = new bootstrap.Modal(document.getElementById('modalAcceptApt'));
        modal.show();
    };

    document.getElementById('btnConfirmAcceptApt')?.addEventListener('click', async () => {
        const aptId = document.getElementById('acceptAptId').value;
        const doctorNotes = document.getElementById('acceptDoctorNotes').value.trim();
        const sendReminder = document.getElementById('acceptSendReminderCheck').checked;
        const btn = document.getElementById('btnConfirmAcceptApt');

        if (!aptId) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Confirming...';

            const payload = {
                status: 'Confirmed',
                doctorNotes: doctorNotes
            };

            const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(data.message || 'Failed to confirm appointment');

            // Optionally send reminder right away
            if (sendReminder) {
                await window.Auth.apiFetch(`/api/appointments/${aptId}/reminder`, {
                    method: 'POST',
                    body: JSON.stringify({
                        reminderNotes: doctorNotes || 'Appointment confirmed! Please arrive 10 minutes before your scheduled slot.'
                    })
                });
            }

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('modalAcceptApt'))?.hide();
            showToast('Appointment confirmed!', true);

            // Reload data
            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to confirm appointment', false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Confirm Visit';
        }
    });

    // ==========================================
    // ACTION 2: SEND REMINDER MODAL & TEMPLATES
    // ==========================================
    window.openSendReminderModal = function (aptId) {
        const apt = state.appointments.find(a => a._id === aptId);
        if (!apt) return;

        const p = apt.patient || {};
        document.getElementById('reminderAptId').value = aptId;
        document.getElementById('remindPatientName').textContent = p.name || 'Patient';
        document.getElementById('remindAptDetails').textContent = `Scheduled on ${formatReadableDate(apt.appointmentDate || apt.date)} at ${apt.appointmentTime || apt.time || '10:00 AM'}`;

        // Default template
        applyReminderTemplate('24h');

        const modal = new bootstrap.Modal(document.getElementById('modalSendReminder'));
        modal.show();
    };

    window.applyReminderTemplate = function (type) {
        const aptId = document.getElementById('reminderAptId').value;
        const apt = state.appointments.find(a => a._id === aptId);
        const pName = apt?.patient?.name || 'Patient';
        const date = formatReadableDate(apt?.appointmentDate || apt?.date);
        const time = apt?.appointmentTime || apt?.time || 'your scheduled slot';
        const docName = (state.currentDoctor?.name) || 'your doctor';

        const textarea = document.getElementById('reminderMessageText');
        if (!textarea) return;

        if (type === '24h') {
            textarea.value = `Hi ${pName}, just a reminder about your appointment with ${docName} scheduled for ${date} at ${time}. Please arrive 10 minutes early.`;
        } else if (type === 'fasting') {
            textarea.value = `Hi ${pName}, for your appointment on ${date} at ${time}, please fast overnight (8 to 10 hours without food; plain water is fine) for blood tests.`;
        } else if (type === 'reports') {
            textarea.value = `Hi ${pName}, please remember to bring your past test reports, prescriptions, and any health papers to your visit on ${date} at ${time}.`;
        } else if (type === 'followup') {
            textarea.value = `Hi ${pName}, Dr. ${docName} would like to follow up with you on ${date} at ${time} to review your progress.`;
        }

        // Highlight selected chip
        document.querySelectorAll('.reminder-template-chip').forEach(c => c.classList.remove('active'));
        event?.currentTarget?.classList.add('active');
    };

    document.getElementById('btnDispatchReminder')?.addEventListener('click', async () => {
        const aptId = document.getElementById('reminderAptId').value;
        const reminderNotes = document.getElementById('reminderMessageText').value.trim();
        const btn = document.getElementById('btnDispatchReminder');

        if (!aptId || !reminderNotes) {
            showToast('Please enter a reminder message.', false);
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sending...';

            const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}/reminder`, {
                method: 'POST',
                body: JSON.stringify({ reminderNotes })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to send reminder');

            bootstrap.Modal.getInstance(document.getElementById('modalSendReminder'))?.hide();
            showToast('Reminder sent to patient!', true);

            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error sending reminder', false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send-fill me-1"></i> Send Reminder';
        }
    });

    // Bulk Remind Tomorrow's Patients
    window.bulkRemindUpcomingPatients = async function () {
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomStr = tomorrowDate.toISOString().split('T')[0];

        const tomorrowApts = state.appointments.filter(a =>
            (a.appointmentDate || a.date) === tomStr &&
            (a.status || '').toLowerCase() === 'confirmed' &&
            !a.reminderSent
        );

        if (tomorrowApts.length === 0) {
            showToast('All upcoming patients for tomorrow already have reminders sent!', true);
            return;
        }

        const confirmed = await window.showConfirmDialog({
            title: 'Send Reminders',
            message: `Send visit reminders to ${tomorrowApts.length} patient(s) scheduled for tomorrow?`,
            subtext: 'Patients will receive arrival and preparation details.',
            confirmText: 'Yes, Send Reminders',
            cancelText: 'Cancel',
            confirmBtnClass: 'btn-primary',
            icon: 'bi-megaphone-fill',
            iconColor: 'text-primary',
            iconBg: 'bg-primary-subtle'
        });
        if (!confirmed) return;

        const btn = document.getElementById('btnBulkRemindTomorrow');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sending...';
        }

        let sentCount = 0;
        for (const apt of tomorrowApts) {
            try {
                await window.Auth.apiFetch(`/api/appointments/${apt._id}/reminder`, {
                    method: 'POST',
                    body: JSON.stringify({
                        reminderNotes: `Visit Reminder: Your appointment is confirmed for tomorrow (${formatReadableDate(tomStr)}) at ${apt.appointmentTime || apt.time || '10:00 AM'}. Please bring any past test reports.`
                    })
                });
                sentCount++;
            } catch (err) {
                console.warn('Bulk reminder error on apt:', apt._id, err);
            }
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send-check me-2"></i> Send Reminder to Tomorrow\'s Patients';
        }

        showToast(`Sent reminders to ${sentCount} patient(s)!`, true);
        await loadAppointments();
    };

    // ==========================================
    // ACTION 3: PRESCRIBE MEDICINE REMINDER MODAL
    // ==========================================
    window.openPrescribeMedModal = function (aptId) {
        const apt = state.appointments.find(a => a._id === aptId);
        if (!apt) return;

        const p = apt.patient || {};
        const pId = p._id || p.id || 'mem_patient_001';

        document.getElementById('prescribeAptId').value = aptId;
        document.getElementById('prescribePatientId').value = pId;
        document.getElementById('prescribePatientName').textContent = p.name || 'Patient';
        document.getElementById('prescribePatientMeta').textContent = `Prescribing for: ${p.email || ''} • Visit on ${formatReadableDate(apt.appointmentDate || apt.date)}`;

        document.getElementById('modalMedName').value = '';
        document.getElementById('modalMedDosage').value = '1 Tablet';
        document.getElementById('modalMedTime').value = '08:00 AM';
        document.getElementById('modalMedInstructions').value = 'Take after meals with water.';

        // Mount DayPicker
        try {
            const mount = document.getElementById('modalDayPickerMount');
            if (mount && window.DayPicker) {
                mount.innerHTML = '';
                state.selectedModalDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                state.modalDayPicker = new window.DayPicker(mount, {
                    initialDays: state.selectedModalDays,
                    onChange: (days) => {
                        state.selectedModalDays = days;
                    }
                });
            }
        } catch (mDpErr) {
            console.warn('Modal DayPicker error:', mDpErr);
        }

        const modal = new bootstrap.Modal(document.getElementById('modalPrescribeMed'));
        modal.show();
    };

    document.getElementById('btnSavePrescription')?.addEventListener('click', async () => {
        const aptId = document.getElementById('prescribeAptId').value;
        const patientId = document.getElementById('prescribePatientId').value;
        const medName = document.getElementById('modalMedName').value.trim();
        const dosage = document.getElementById('modalMedDosage').value.trim();
        const time = document.getElementById('modalMedTime').value.trim();
        const instructions = document.getElementById('modalMedInstructions').value.trim();
        const btn = document.getElementById('btnSavePrescription');

        if (!medName || !dosage || !time) {
            showToast('Please enter medicine name, dosage, and reminder time.', false);
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

            const daysStr = (state.selectedModalDays && state.selectedModalDays.length > 0)
                ? state.selectedModalDays.join(', ')
                : 'Mon, Tue, Wed, Thu, Fri';

            // 1. Post to /api/medicines with patientId
            const todayStr = new Date().toISOString().split('T')[0];
            const { response, data } = await window.Auth.apiFetch('/api/medicines', {
                method: 'POST',
                body: JSON.stringify({
                    patientId,
                    medicineName: medName,
                    name: medName,
                    dosage,
                    frequency: 'Weekly',
                    reminderDay: daysStr,
                    time,
                    date: todayStr,
                    instructions
                })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to prescribe medicine');

            // 2. Also log note onto appointment
            if (aptId) {
                await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        doctorNotes: `Prescribed: ${medName} (${dosage}) at ${time} [${daysStr}]`
                    })
                });
            }

            bootstrap.Modal.getInstance(document.getElementById('modalPrescribeMed'))?.hide();
            showToast(`Added reminder for "${medName}" to patient's schedule!`, true);

            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to save medication reminder', false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Save Reminder';
        }
    });

    // ==========================================
    // ACTION 4: COMPLETE APPOINTMENT
    // ==========================================
    window.openCompleteAptModal = function (aptId) {
        const apt = state.appointments.find(a => a._id === aptId);
        if (!apt) return;

        document.getElementById('completeAptId').value = aptId;
        document.getElementById('completePatientName').textContent = apt.patient?.name || 'Patient';
        document.getElementById('completeAptMeta').textContent = `Consultation on ${formatReadableDate(apt.appointmentDate || apt.date)} at ${apt.appointmentTime || apt.time || '10:00 AM'}`;
        document.getElementById('completeDiagnosisNotes').value = '';
        document.getElementById('completeAdviceText').value = 'Continue prescribed medicines. Review in 4 weeks.';

        const modal = new bootstrap.Modal(document.getElementById('modalCompleteApt'));
        modal.show();
    };

    document.getElementById('btnConfirmCompleteApt')?.addEventListener('click', async () => {
        const aptId = document.getElementById('completeAptId').value;
        const diagnosis = document.getElementById('completeDiagnosisNotes').value.trim();
        const advice = document.getElementById('completeAdviceText').value.trim();
        const btn = document.getElementById('btnConfirmCompleteApt');

        if (!diagnosis) {
            showToast('Please enter clinic notes or diagnosis.', false);
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

            const summary = `${diagnosis}${advice ? ' | Advice: ' + advice : ''}`;

            const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'Completed',
                    doctorNotes: summary
                })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to complete visit');

            bootstrap.Modal.getInstance(document.getElementById('modalCompleteApt'))?.hide();
            showToast('Visit marked as completed!', true);

            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error updating appointment', false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check2-all me-1"></i> Save & Finish Visit';
        }
    });

    // ==========================================
    // ACTION 5: CANCEL APPOINTMENT
    // ==========================================
    window.openCancelAptModal = function (aptId) {
        document.getElementById('cancelAptId').value = aptId;
        document.getElementById('cancelReasonText').value = 'Doctor unavailable or patient requested cancellation';

        const modal = new bootstrap.Modal(document.getElementById('modalCancelApt'));
        modal.show();
    };

    document.getElementById('btnConfirmCancelApt')?.addEventListener('click', async () => {
        const aptId = document.getElementById('cancelAptId').value;
        const reason = document.getElementById('cancelReasonText').value.trim();
        const btn = document.getElementById('btnConfirmCancelApt');

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cancelling...';

            const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'Cancelled',
                    doctorNotes: `Cancelled: ${reason}`
                })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to cancel appointment');

            bootstrap.Modal.getInstance(document.getElementById('modalCancelApt'))?.hide();
            showToast('Appointment cancelled.', true);

            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error cancelling appointment', false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash3 me-1"></i> Cancel Appointment';
        }
    });

    // ==========================================
    // ACTION 6: NEW WALK-IN REGISTRATION
    // ==========================================
    document.getElementById('btnOpenNewAptModal')?.addEventListener('click', () => {
        const dateInput = document.getElementById('walkinDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        const modal = new bootstrap.Modal(document.getElementById('modalNewApt'));
        modal.show();
    });

    document.getElementById('newWalkinForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('walkinName').value.trim();
        const email = document.getElementById('walkinEmail').value.trim();
        const phone = document.getElementById('walkinPhone').value.trim();
        const date = document.getElementById('walkinDate').value;
        const time = document.getElementById('walkinTime').value.trim();
        const reason = document.getElementById('walkinReason').value.trim();
        const status = document.getElementById('walkinStatus').value;

        try {
            const { response, data } = await window.Auth.apiFetch('/api/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    patientName: name,
                    patientEmail: email,
                    patientPhone: phone,
                    appointmentDate: date,
                    date,
                    appointmentTime: time,
                    time,
                    reason,
                    notes: reason,
                    status
                })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to create walk-in appointment');

            bootstrap.Modal.getInstance(document.getElementById('modalNewApt'))?.hide();
            e.target.reset();
            showToast(`Walk-in visit for ${name} registered successfully!`, true);

            await loadAppointments();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to create appointment', false);
        }
    });

    // ==========================================
    // TAB 2: REMINDERS HUB RENDERING & SHORTCUTS
    // ==========================================
    function renderRemindersTabContent() {
        const queueList = document.getElementById('remindersQueueList');
        const badge = document.getElementById('remindersQueueBadge');
        const historyBody = document.getElementById('remindersHistoryBody');

        if (!queueList) return;

        // Upcoming confirmed visits needing reminders
        const todayStr = new Date().toISOString().split('T')[0];
        const needingReminders = state.appointments.filter(a =>
            (a.status || '').toLowerCase() === 'confirmed' &&
            (a.appointmentDate || a.date) >= todayStr &&
            !a.reminderSent
        );

        if (badge) badge.textContent = `${needingReminders.length} Pending`;

        if (needingReminders.length === 0) {
            queueList.innerHTML = `
                <div class="text-center py-4 bg-light rounded-4 border">
                    <i class="bi bi-shield-check fs-2 text-success d-block mb-2"></i>
                    <h6 class="fw-bold text-dark mb-1">Queue is Up to Date!</h6>
                    <p class="text-muted small mb-0">All upcoming confirmed appointments have had reminders dispatched.</p>
                </div>
            `;
        } else {
            queueList.innerHTML = needingReminders.map(apt => {
                const p = apt.patient || {};
                const relative = getRelativeSchedule(apt.appointmentDate || apt.date, apt.appointmentTime || apt.time);

                return `
                    <div class="p-3 bg-light rounded-4 border d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div class="d-flex align-items-center gap-3">
                            <div class="patient-avatar">${(p.name || 'P').charAt(0).toUpperCase()}</div>
                            <div>
                                <h6 class="fw-bold mb-0 text-dark">${p.name || 'Patient'}</h6>
                                <div class="small text-muted">
                                    ${p.phone || 'No phone'} &bull; <span class="badge ${relative.badge} rounded-pill">${relative.label}</span>
                                </div>
                                <div class="small text-secondary mt-1">${apt.reason || apt.notes || 'General consultation'}</div>
                            </div>
                        </div>
                        <button class="btn btn-primary rounded-pill btn-sm px-3 py-1 fw-bold shadow-sm d-flex align-items-center gap-1" onclick="openSendReminderModal('${apt._id}')">
                            <i class="bi bi-bell-fill"></i> Send Reminder
                        </button>
                    </div>
                `;
            }).join('');
        }

        // Reminders History Table
        if (historyBody) {
            const sentList = state.appointments.filter(a => a.reminderSent);
            if (sentList.length === 0) {
                historyBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No reminders recorded yet.</td></tr>`;
            } else {
                historyBody.innerHTML = sentList.map(apt => {
                    const p = apt.patient || {};
                    const sentAt = apt.reminderSentAt ? new Date(apt.reminderSentAt).toLocaleString() : 'Recently';
                    return `
                        <tr>
                            <td>
                                <div class="fw-bold text-dark">${p.name || 'Patient'}</div>
                                <div class="small text-muted">${p.phone || ''}</div>
                            </td>
                            <td>${formatReadableDate(apt.appointmentDate || apt.date)} at ${apt.appointmentTime || apt.time || '10:00 AM'}</td>
                            <td class="small text-dark" style="max-width: 300px;">${apt.reminderNotes || 'Appointment reminder dispatched'}</td>
                            <td class="small text-muted">${sentAt}</td>
                            <td><span class="badge bg-success-subtle text-success rounded-pill"><i class="bi bi-check2"></i> Delivered</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // Populate Patient Select dropdowns for quick prescribing
    function populatePatientDropdowns() {
        const select = document.getElementById('quickPrescribePatientSelect');
        if (!select) return;

        const patients = [];
        const seen = new Set();

        state.appointments.forEach(a => {
            const p = a.patient;
            if (p && p._id && !seen.has(p._id)) {
                seen.add(p._id);
                patients.push({ id: p._id, name: p.name, email: p.email });
            }
        });

        select.innerHTML = '<option value="">-- Choose Confirmed Patient --</option>' +
            patients.map(p => `<option value="${p.id}">${p.name} (${p.email || 'Patient'})</option>`).join('');
    }

    // Quick Prescribe Form Handler
    document.getElementById('quickPrescribeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('quickPrescribePatientSelect').value;
        const medName = document.getElementById('quickMedName').value.trim();
        const dosage = document.getElementById('quickMedDosage').value.trim();
        const time = document.getElementById('quickMedTime').value.trim();
        const instructions = document.getElementById('quickMedInstructions').value.trim();

        if (!patientId) {
            showToast('Please select a patient from the list.', false);
            return;
        }

        const daysStr = (state.selectedQuickDays && state.selectedQuickDays.length > 0)
            ? state.selectedQuickDays.join(', ')
            : 'Mon, Tue, Wed, Thu, Fri';

        const submitBtn = e.target.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

            const todayStr = new Date().toISOString().split('T')[0];
            const { response, data } = await window.Auth.apiFetch('/api/medicines', {
                method: 'POST',
                body: JSON.stringify({
                    patientId,
                    medicineName: medName,
                    name: medName,
                    dosage,
                    frequency: 'Weekly',
                    reminderDay: daysStr,
                    time,
                    date: todayStr,
                    instructions
                })
            });

            if (!response.ok) throw new Error(data.message || 'Failed to prescribe medicine');

            e.target.reset();
            showToast(`Prescription reminder for "${medName}" saved to patient!`, true);
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Error saving prescription', false);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Save to Patient\'s Schedule';
        }
    });

    // ==========================================
    // FILTER CONTROLS & TAB SWITCHING
    // ==========================================
    window.filterByStatus = function (status) {
        state.activeStatusFilter = status;
        const aptTable = document.getElementById('appointmentsTableBody');
        if (aptTable) {
            document.querySelectorAll('.status-badge-btn, .status-filter-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === status) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            applyFiltersAndRender();
        } else {
            window.location.href = 'appointments.html?status=' + encodeURIComponent(status);
        }
    };

    window.selectDateFilter = function (val, label) {
        state.activeDateFilter = val;
        const labelEl = document.getElementById('dateFilterLabel');
        if (labelEl) labelEl.textContent = label;
        const hiddenSelect = document.getElementById('dateFilterSelect');
        if (hiddenSelect) hiddenSelect.value = val;
        document.querySelectorAll('.date-filter-item').forEach(item => {
            const isMatch = item.getAttribute('data-value') === val;
            item.classList.toggle('active', isMatch);
            item.classList.toggle('fw-bold', isMatch);
        });
        applyFiltersAndRender();
    };

    window.applyDateFilter = function () {
        const select = document.getElementById('dateFilterSelect');
        if (select) {
            state.activeDateFilter = select.value;
            applyFiltersAndRender();
        }
    };

    window.resetFilters = function () {
        state.searchQuery = '';
        const searchInput = document.getElementById('searchAppointmentInput');
        if (searchInput) searchInput.value = '';
        selectDateFilter('all', 'All Dates');
        filterByStatus('All');
    };

    window.openWalkInModal = function () {
        const btn = document.getElementById('btnOpenNewAptModal');
        if (btn) btn.click();
    };

    window.switchNavTab = function (tab) {
        state.activeTab = tab;
        const tabDash = document.getElementById('tabContentDashboard');
        const tabApt = document.getElementById('tabContentAppointments');
        const tabRem = document.getElementById('tabContentReminders');
        const btnDash = document.getElementById('tabBtnDashboard');
        const btnApt = document.getElementById('tabBtnAppointments');
        const btnRem = document.getElementById('tabBtnReminders');
        const pageTitle = document.getElementById('pageHeaderTitle');

        if (tabDash) tabDash.classList.toggle('d-none', tab !== 'dashboard');
        if (tabApt) tabApt.classList.toggle('d-none', tab !== 'appointments');
        if (tabRem) tabRem.classList.toggle('d-none', tab !== 'reminders');

        if (btnDash) btnDash.classList.toggle('active', tab === 'dashboard');
        if (btnApt) btnApt.classList.toggle('active', tab === 'appointments');
        if (btnRem) btnRem.classList.toggle('active', tab === 'reminders');

        if (tab === 'dashboard') {
            if (pageTitle) pageTitle.textContent = 'Doctor Dashboard Overview';
            renderDashboardRecent();
        } else if (tab === 'appointments') {
            if (pageTitle) pageTitle.textContent = 'Appointments Queue';
        } else if (tab === 'reminders') {
            if (pageTitle) pageTitle.textContent = 'Patient Reminders';
            renderRemindersTabContent();
        }

        // Close mobile sidebar if open
        document.getElementById('adminSidebar')?.classList.remove('show');
        document.getElementById('adminBackdrop')?.classList.remove('show');
    };

    // Live search listener
    document.getElementById('searchAppointmentInput')?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        applyFiltersAndRender();
    });

    // Refresh Queue button
    document.getElementById('btnRefreshQueue')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnRefreshQueue');
        btn.classList.add('disabled');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Refreshing...';
        await loadAppointments();
        btn.classList.remove('disabled');
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Refresh List';
        showToast('Appointments list refreshed.', true);
    });

    // ==========================================
    // INITIALIZATION ON DOM READY
    // ==========================================
    document.addEventListener('DOMContentLoaded', async () => {
        // Enforce doctor/admin access (strictly granted by Admin from Admin panel)
        const hasAccess = await window.Auth.requireDoctor();
        if (!hasAccess) {
            return;
        }

        // Mobile Sidebar toggles (Matches Admin Panel)
        const sidebar = document.getElementById('adminSidebar');
        const backdrop = document.getElementById('adminBackdrop');
        const toggleBtn = document.getElementById('mobileSidebarToggle');

        toggleBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('show');
            backdrop?.classList.toggle('show');
        });
        backdrop?.addEventListener('click', () => {
            sidebar?.classList.remove('show');
            backdrop?.classList.remove('show');
        });

        setupDoctorHeader();
        setupDoctorSelfProfileHandlers();
        updateLiveClock();
        setInterval(updateLiveClock, 1000);

        // Mount Quick DayPicker on Reminders Hub
        try {
            const quickMount = document.getElementById('quickDayPickerMount');
            if (quickMount && window.DayPicker) {
                state.quickDayPicker = new window.DayPicker(quickMount, {
                    initialDays: state.selectedQuickDays,
                    onChange: (days) => {
                        state.selectedQuickDays = days;
                    }
                });
            }
        } catch (dpErr) {
            console.warn('DayPicker initialization error:', dpErr);
        }

        // Check URL parameters for status filter (e.g. ?status=Pending)
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const statusParam = urlParams.get('status');
            if (statusParam) {
                state.activeStatusFilter = statusParam;
                document.querySelectorAll('.status-badge-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-filter') === statusParam);
                });
            }
        } catch (urlErr) {
            console.warn('URL param parse error:', urlErr);
        }

        // Fetch initial data
        await loadAppointments();
    });

    let doctorSelfProfileModalInstance = null;

    window.openDoctorSelfProfileModal = async () => {
        const modalEl = document.getElementById('doctorSelfProfileModal');
        if (!modalEl) return;
        if (!doctorSelfProfileModalInstance && window.bootstrap && window.bootstrap.Modal) {
            doctorSelfProfileModalInstance = new bootstrap.Modal(modalEl);
        }

        const user = window.Auth ? window.Auth.getCurrentUser() : null;
        let docProfile = {};
        try {
            const { response, data } = await window.Auth.apiFetch('/api/doctors/profile/me');
            if (response.ok && data.success && data.data) {
                docProfile = data.data;
            }
        } catch (e) {
            console.warn('Could not fetch doctor profile:', e);
        }

        const nameEl = document.getElementById('selfDocName');
        const phoneEl = document.getElementById('selfDocPhone');
        const expEl = document.getElementById('selfDocExperience');
        const specEl = document.getElementById('selfDocSpecialization');
        const deptEl = document.getElementById('selfDocDepartment');
        const hospEl = document.getElementById('selfDocHospital');
        const imgInput = document.getElementById('selfDocImageInput');
        const imgPreview = document.getElementById('selfDocImagePreview');
        const fileInput = document.getElementById('selfDocPhotoFileInput');

        const cleanName = (docProfile.name || user?.name || '').replace(/^Dr\.\s*/i, '').trim();
        if (nameEl) nameEl.value = cleanName ? `Dr. ${cleanName}` : 'Dr. ';

        const rawPhone = docProfile.phone || user?.phone || '';
        if (phoneEl) phoneEl.value = (rawPhone && rawPhone !== 'Not specified') ? rawPhone : '';

        if (expEl) expEl.value = docProfile.experience || '5+ Yrs Exp';
        if (specEl) specEl.value = docProfile.specialization || 'General Physician';
        if (deptEl) deptEl.value = docProfile.department || 'Internal Medicine';
        if (hospEl) hospEl.value = docProfile.hospital || 'AIIMS New Delhi';

        const currentImg = docProfile.image || user?.avatar || '/images/male-doctor.jpg';
        if (imgInput) imgInput.value = currentImg;
        if (imgPreview) imgPreview.src = currentImg;
        if (fileInput) fileInput.value = '';

        if (doctorSelfProfileModalInstance) doctorSelfProfileModalInstance.show();
    };

    function setupDoctorSelfProfileHandlers() {
        const fileInput = document.getElementById('selfDocPhotoFileInput');
        const previewEl = document.getElementById('selfDocImagePreview');
        const hiddenInput = document.getElementById('selfDocImageInput');
        const dropzone = document.getElementById('selfDocDropzone');
        const form = document.getElementById('doctorSelfProfileForm');

        const handleFile = (file) => {
            if (!file || !file.type.startsWith('image/')) {
                showToast('Please select a valid image file (JPG, PNG, WebP).', false);
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Uri = e.target.result;
                if (previewEl) previewEl.src = base64Uri;

                try {
                    const { response, data } = await window.Auth.apiFetch('/api/admin/upload-image', {
                        method: 'POST',
                        body: JSON.stringify({
                            image: base64Uri,
                            filename: file.name
                        })
                    });
                    if (response.ok && data.success && data.url) {
                        if (hiddenInput) hiddenInput.value = data.url;
                        if (previewEl) previewEl.src = data.url;
                        showToast('Doctor photo uploaded successfully!', true);
                    } else {
                        if (hiddenInput) hiddenInput.value = base64Uri;
                    }
                } catch (err) {
                    console.warn('Image upload fallback to data URI:', err);
                    if (hiddenInput) hiddenInput.value = base64Uri;
                }
            };
            reader.readAsDataURL(file);
        };

        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('bg-primary-subtle');
            });
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.classList.remove('bg-primary-subtle');
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('bg-primary-subtle');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        if (form && !form._curemedInit) {
            form._curemedInit = true;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('selfDocSubmitBtn');
                const name = document.getElementById('selfDocName').value.trim();
                const phone = document.getElementById('selfDocPhone').value.trim();
                const experience = document.getElementById('selfDocExperience').value.trim();
                const specialization = document.getElementById('selfDocSpecialization').value.trim();
                const department = document.getElementById('selfDocDepartment').value.trim();
                const hospital = document.getElementById('selfDocHospital').value.trim();
                const image = document.getElementById('selfDocImageInput').value;

                if (!name) {
                    showToast('Please provide your doctor name.', false);
                    return;
                }
                if (!phone) {
                    showToast('Please provide your contact phone number.', false);
                    return;
                }
                if (!experience) {
                    showToast('Please specify your medical experience.', false);
                    return;
                }

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving Profile...';
                }

                try {
                    const { response, data } = await window.Auth.apiFetch('/api/doctors/profile/me', {
                        method: 'PUT',
                        body: JSON.stringify({
                            name,
                            phone,
                            experience,
                            image,
                            specialization,
                            department,
                            hospital
                        })
                    });

                    if (response.ok && data.success) {
                        if (doctorSelfProfileModalInstance) doctorSelfProfileModalInstance.hide();
                        showToast('Doctor Profile updated successfully!', true);

                        // Update local auth user
                        const user = window.Auth ? window.Auth.getCurrentUser() : null;
                        if (user) {
                            user.name = name;
                            user.phone = phone;
                            user.avatar = image;
                            window.Auth.login(window.Auth.getToken(), user);
                        }

                        setupDoctorHeader();
                    } else {
                        showToast(data.message || 'Could not update profile.', false);
                    }
                } catch (err) {
                    console.error('Error updating doctor profile:', err);
                    showToast('Error saving profile: ' + (err.message || 'Network error'), false);
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Save Profile Details';
                    }
                }
            });
        }
    }

})();
