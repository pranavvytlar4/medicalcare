/**
 * ============================================================================
 * Medical Care - Enterprise Admin Management Controller
 * Handles full administration: Doctors (with image upload/preview/gallery),
 * Appointments, Donors, Prescriptions, Wellness Logs, Records, and Users.
 * ============================================================================
 */

let allDoctors = [];


let allAppointments = [];
let allDonors = [];
let allMedicines = [];
let allWellness = [];
let allRecords = [];

let allUsers = []; // Populated dynamically from /api/admin/users

let currentDoctorViewMode = 'grid'; // 'grid' | 'table'
let doctorModalInstance = null;
let addDonorModalInstance = null;

// Preset doctor images available in the system
const PRESET_DOCTOR_AVATARS = [
    { url: '/images/dr-sarah-johnson.jpg', name: 'Dr. Sarah (Cardiology)' },
    { url: '/images/dr-robert-miller.jpg', name: 'Dr. Robert (Neurology)' },
    { url: '/images/dr-emily-watson.jpg', name: 'Dr. Emily (Internal Med)' },
    { url: '/images/dr-aisha-patel.jpg', name: 'Dr. Aisha (Pediatrics)' },
    { url: '/images/dr-rodrigues.jpg', name: 'Dr. Rodrigues (Orthopedics)' },
    { url: '/images/male-doctor.jpg', name: 'Male Specialist (Emergency)' }
];

// Helper to show floating toast messages (delegates safely to window.showToast from auth.js or fallbacks)
const displayToast = (message, type = 'success') => {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    let container = document.getElementById('globalToastContainer') || document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '99999';
        document.body.appendChild(container);
    }

    const toastId = 'toast_' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning text-dark' : 'bg-primary';
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center gap-2 fw-semibold">
                    <i class="bi ${icon} fs-5"></i>
                    <span>${message}</span>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    if (window.bootstrap && window.bootstrap.Toast) {
        const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
        bsToast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }
};
if (!window.showToast) {
    window.showToast = displayToast;
}

const closeMobileSidebar = () => {
    document.getElementById('adminSidebar')?.classList.remove('show');
    document.getElementById('adminBackdrop')?.classList.remove('show');
};

// Switch active admin section tab (globally accessible for onclick handlers)
window.switchTab = function switchTab(tabName) {
    try {
        localStorage.setItem('admin_active_tab', tabName);
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#' + tabName);
        }
    } catch (e) {}

    document.querySelectorAll('.admin-nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        if (pane.id === ('tab-' + tabName)) {
            pane.classList.remove('d-none');
            pane.style.display = 'block';
        } else {
            pane.classList.add('d-none');
            pane.style.display = 'none';
        }
    });

    // Update section title badge
    const headerTitle = document.getElementById('adminSectionTitle');
    if (headerTitle) {
        const titles = {
            'dashboard': 'Platform Overview & KPI Metrics',
            'doctors': 'Specialist Doctors Directory & Management',
            'appointments': 'Hospital Consultations & Appointments',
            'donors': 'Blood Donor Registry & Lifesaving Network',
            'medicines': 'Patient Medication Reminders',
            'wellness': 'Mental Wellness & Mood Journals',
            'records': 'Patient Clinical Records & Diagnoses',
            'users': 'Registered User Accounts & Access Roles'
        };
        headerTitle.textContent = titles[tabName] || 'Admin Center';
    }

    // Trigger tab-specific refresh if available
    if (tabName === 'doctors' && typeof window.filterDoctors === 'function') window.filterDoctors();
    if (tabName === 'appointments' && typeof window.filterAppointments === 'function') window.filterAppointments();
    if (tabName === 'donors' && typeof window.filterDonors === 'function') window.filterDonors();
    if (tabName === 'users') {
        if (typeof window.filterUsers === 'function') window.filterUsers();
        if (typeof window.loadUsers === 'function' && (!allUsers || allUsers.length === 0)) window.loadUsers();
    }

    closeMobileSidebar();
};
const switchTab = window.switchTab;

// Refresh all admin data (resilient to individual endpoint errors)
const refreshAllData = async () => {
    try {
        await Promise.allSettled([
            loadStats(),
            loadDoctors(),
            loadAppointments(),
            loadDonors(),
            loadMedicines(),
            loadWellness(),
            loadMedicalRecords(),
            loadUsers()
        ]);
    } catch (err) {
        console.warn('Error refreshing admin data:', err);
    }
};

// -----------------------------------------------------------------------------
// 1. STATS & OVERVIEW
// -----------------------------------------------------------------------------
const loadStats = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/admin/stats');
        if (response.ok && data.success) {
            const s = data.stats || {};
            const setTxt = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val ?? 0;
            };

            setTxt('kpiDoctors', s.totalDoctors);
            setTxt('kpiAppointments', s.totalAppointments);
            setTxt('kpiDonors', s.totalDonors);
            setTxt('kpiMedicines', s.totalMedicines);
            setTxt('kpiWellness', s.totalWellness);
            setTxt('kpiRecords', s.totalRecords);
            setTxt('kpiUsers', s.totalUsers);

            // Nav Badges
            setTxt('badgeCountDoctors', s.totalDoctors);
            setTxt('badgeCountApts', s.totalAppointments);
            setTxt('badgeCountDonors', s.totalDonors);
            setTxt('badgeCountUsers', s.totalUsers);

            // Status Breakdown
            if (s.statusCounts) {
                setTxt('statConfirmedApts', s.statusCounts.confirmed);
                setTxt('statPendingApts', s.statusCounts.pending);
                setTxt('statCompletedApts', s.statusCounts.completed);
                setTxt('statCancelledApts', s.statusCounts.cancelled);
            }

            // Render Recent Appointments in Overview
            renderRecentAppointments(data.recentAppointments || []);
            renderRecentUsers(data.recentUsers || []);
        }
    } catch (err) {
        console.warn('Failed to load admin stats:', err);
    }
};

const renderRecentAppointments = (list) => {
    const tbody = document.getElementById('recentAptsTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No recent appointments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(apt => {
        const patientName = apt.patient ? (apt.patient.name || apt.patient.email) : 'Patient';
        const docName = apt.doctor ? (apt.doctor.name || 'Specialist') : 'Doctor';
        const status = apt.status || 'Confirmed';
        const statusBadge = getStatusBadge(status);

        return `
            <tr>
                <td class="fw-bold text-dark">${patientName}</td>
                <td><span class="text-primary fw-semibold">${docName}</span></td>
                <td><i class="bi bi-calendar3 me-1 text-muted"></i>${apt.appointmentDate || apt.date || 'TBD'} <small class="text-muted">(${apt.appointmentTime || apt.time || '10:00 AM'})</small></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2" onclick="viewAppointmentDetails('${apt._id}')">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

const renderRecentUsers = (list) => {
    const tbody = document.getElementById('recentUsersTableBody');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No recent users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(u => {
        const roleBadge = u.role === 'Admin' ? '<span class="badge bg-danger">Admin</span>' : u.role === 'Doctor' ? '<span class="badge bg-info text-dark">Doctor</span>' : '<span class="badge bg-primary">Patient</span>';
        return `
            <tr>
                <td class="fw-bold">${u.name}</td>
                <td class="text-muted small">${u.email}</td>
                <td>${roleBadge}</td>
                <td class="small text-muted">${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
};

// -----------------------------------------------------------------------------
// 2. DOCTORS MANAGEMENT (Adding, Editing, Image Handling, Deleting)
// -----------------------------------------------------------------------------
const loadDoctors = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/doctors');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allDoctors = data.data;
            filterDoctors();
        }
    } catch (err) {
        console.error('Error fetching doctors:', err);
    }
};

const setDoctorView = (mode) => {
    currentDoctorViewMode = mode;
    document.getElementById('btnViewGrid')?.classList.toggle('active', mode === 'grid');
    document.getElementById('btnViewTable')?.classList.toggle('active', mode === 'table');
    filterDoctors();
};

const filterDoctors = () => {
    const search = (document.getElementById('doctorSearchInput')?.value || '').toLowerCase().trim();
    const spec = document.getElementById('doctorSpecFilter')?.value || '';

    let filtered = allDoctors.filter(doc => {
        const matchSearch = !search ||
            (doc.name || '').toLowerCase().includes(search) ||
            (doc.specialization || '').toLowerCase().includes(search) ||
            (doc.department || '').toLowerCase().includes(search) ||
            (doc.hospital || '').toLowerCase().includes(search) ||
            (doc.email || '').toLowerCase().includes(search);

        const matchSpec = !spec || (doc.specialization || '').toLowerCase().includes(spec.toLowerCase());
        return matchSearch && matchSpec;
    });

    renderDoctors(filtered);
};
window.filterDoctors = filterDoctors;

const resolveDoctorImg = (doc) => {
    if (doc && doc.image) {
        if (doc.image.startsWith('http://') || doc.image.startsWith('https://') || doc.image.startsWith('/') || doc.image.startsWith('data:')) {
            return doc.image;
        }
        return '/' + doc.image.replace(/^\.\.\//, '').replace(/^\.\//, '');
    }
    const n = ((doc && doc.name) || '').toLowerCase();
    if (n.includes('priya') || n.includes('sarah')) return '/images/dr-sarah-johnson.jpg';
    if (n.includes('rajesh') || n.includes('robert')) return '/images/dr-robert-miller.jpg';
    if (n.includes('ananya') || n.includes('emily')) return '/images/dr-emily-watson.jpg';
    if (n.includes('devraj') || n.includes('david') || n.includes('rodrigues') || n.includes('tiago')) return '/images/dr-rodrigues.jpg';
    if (n.includes('aisha')) return '/images/dr-aisha-patel.jpg';
    return '/images/male-doctor.jpg';
};

const renderDoctors = (doctors) => {
    const gridContainer = document.getElementById('doctorsGridContainer');
    const tableContainer = document.getElementById('doctorsTableContainer');
    const emptyState = document.getElementById('doctorsEmptyState');

    if (!gridContainer || !tableContainer) return;

    if (doctors.length === 0) {
        gridContainer.classList.add('d-none');
        tableContainer.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    if (currentDoctorViewMode === 'grid') {
        tableContainer.classList.add('d-none');
        gridContainer.classList.remove('d-none');

        gridContainer.innerHTML = doctors.map(doc => {
            const imgSrc = resolveDoctorImg(doc);
            return `
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="doctor-adm-card">
                        <div class="doctor-adm-img-wrap">
                            <img src="${imgSrc}" alt="${doc.name}" onerror="this.src='/images/male-doctor.jpg'">
                            <span class="doctor-adm-badge text-primary"><i class="bi bi-patch-check-fill me-1"></i> NMC Verified</span>
                        </div>
                        <div class="p-3 d-flex flex-column flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 class="fw-bold mb-0 fs-6 text-dark">${doc.name}</h5>
                                    <span class="badge bg-primary-subtle text-primary rounded-pill small mt-1">${doc.specialization}</span>
                                </div>
                                <span class="badge bg-light text-dark border small fw-bold">${doc.consultationFee || '₹500'}</span>
                            </div>
                            <div class="small text-muted mb-3 flex-grow-1">
                                <div class="mb-1"><i class="bi bi-hospital me-2 text-primary"></i>${doc.hospital || 'AIIMS New Delhi'}</div>
                                <div class="mb-1"><i class="bi bi-diagram-3 me-2 text-primary"></i>${doc.department}</div>
                                <div class="mb-1"><i class="bi bi-telephone me-2 text-primary"></i>${doc.phone || 'N/A'}</div>
                                <div><i class="bi bi-envelope me-2 text-primary"></i>${doc.email}</div>
                            </div>
                            <div class="d-flex gap-2 pt-2 border-top">
                                <button class="btn btn-outline-primary btn-sm flex-grow-1 rounded-pill fw-semibold" onclick="openEditDoctorModal('${doc._id}')">
                                    <i class="bi bi-pencil-square me-1"></i> Edit
                                </button>
                                <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="confirmDeleteDoctor('${doc._id}', '${doc.name}')" title="Delete Doctor">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        gridContainer.classList.add('d-none');
        tableContainer.classList.remove('d-none');

        const tbody = document.getElementById('doctorsTableBody');
        if (tbody) {
            tbody.innerHTML = doctors.map(doc => {
                const imgSrc = resolveDoctorImg(doc);
                return `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-3">
                                <img src="${imgSrc}" class="doctor-thumb" alt="${doc.name}" onerror="this.src='/images/male-doctor.jpg'">
                                <div>
                                    <div class="fw-bold text-dark">${doc.name}</div>
                                    <small class="text-muted">${doc.email}</small>
                                </div>
                            </div>
                        </td>
                        <td><span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">${doc.specialization}</span></td>
                        <td>
                            <div class="fw-semibold text-dark">${doc.hospital || 'AIIMS New Delhi'}</div>
                            <small class="text-muted">${doc.department}</small>
                        </td>
                        <td>${doc.phone}</td>
                        <td class="fw-bold text-dark">${doc.consultationFee || '₹500'}</td>
                        <td class="text-end text-nowrap">
                            <button class="btn btn-sm btn-outline-primary rounded-pill me-1" onclick="openEditDoctorModal('${doc._id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="confirmDeleteDoctor('${doc._id}', '${doc.name}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
};
window.renderDoctors = renderDoctors;

// Preset Avatars Grid in Doctor Modal
const renderPresetAvatars = () => {
    const container = document.getElementById('presetAvatarsGrid');
    if (!container) return;

    container.innerHTML = PRESET_DOCTOR_AVATARS.map(avatar => `
        <button type="button" class="preset-avatar-btn" data-url="${avatar.url}" title="${avatar.name}">
            <img src="${avatar.url}" alt="${avatar.name}">
        </button>
    `).join('');

    container.querySelectorAll('.preset-avatar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const url = btn.getAttribute('data-url');
            setDoctorImagePreview(url);
            document.getElementById('doctorImageInput').value = url;
            document.getElementById('doctorPhotoFileInput').value = '';
        });
    });
};

// Image Upload Drag & Drop and Preview Handlers
const setupImageUploadHandlers = () => {
    const fileInput = document.getElementById('doctorPhotoFileInput');
    const dropzone = document.getElementById('imageDropzone');
    const urlInput = document.getElementById('doctorImageInput');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageFile(file);
        });
    }

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (urlInput) {
        urlInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val) {
                setDoctorImagePreview(val);
                document.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));
            }
        });
    }
};

const handleImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, WebP).', 'danger');
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        showToast('File size exceeds 15MB limit.', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;
        setDoctorImagePreview(base64Data);
        // Store base64 data in hidden / main image input
        document.getElementById('doctorImageInput').value = base64Data;
        document.getElementById('doctorPhotoFilename').value = file.name;
        document.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));
    };
    reader.readAsDataURL(file);
};

const setDoctorImagePreview = (src) => {
    const imgEl = document.getElementById('doctorImagePreview');
    const placeholderEl = document.getElementById('doctorImagePlaceholder');
    const boxEl = document.getElementById('doctorImagePreviewBox');
    if (imgEl) {
        imgEl.onerror = () => {
            imgEl.removeAttribute('src');
            imgEl.style.display = 'none';
            if (placeholderEl) {
                placeholderEl.style.display = 'flex';
                placeholderEl.classList.remove('d-none');
            }
            if (boxEl) {
                boxEl.style.border = '2px dashed #cbd5e1';
                boxEl.style.boxShadow = 'none';
            }
        };

        if (src && src.trim()) {
            imgEl.src = src;
            imgEl.style.display = 'block';
            if (placeholderEl) placeholderEl.style.display = 'none';
            if (boxEl) {
                boxEl.style.border = '3px solid #fff';
                boxEl.style.boxShadow = 'var(--adm-shadow-md)';
            }
        } else {
            imgEl.removeAttribute('src');
            imgEl.style.display = 'none';
            if (placeholderEl) {
                placeholderEl.style.display = 'flex';
                placeholderEl.classList.remove('d-none');
            }
            if (boxEl) {
                boxEl.style.border = '2px dashed #cbd5e1';
                boxEl.style.boxShadow = 'none';
            }
        }
    }
};

// Open Add Doctor Modal
window.openAddDoctorModal = () => {
    const form = document.getElementById('doctorForm');
    if (form) form.reset();

    delete form.dataset.editId;
    document.getElementById('doctorModalTitle').innerHTML = '<i class="bi bi-person-plus-fill me-2 text-primary"></i> Add New Specialist Doctor';
    document.getElementById('doctorSubmitBtn').innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Doctor';

    setDoctorImagePreview('');
    document.getElementById('doctorImageInput').value = '';
    document.getElementById('doctorPhotoFilename').value = '';
    document.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));

    if (doctorModalInstance) doctorModalInstance.show();
};

// Open Edit Doctor Modal
window.openEditDoctorModal = (doctorId) => {
    const doctor = allDoctors.find(d => d._id === doctorId);
    if (!doctor) {
        showToast('Doctor record not found.', 'danger');
        return;
    }

    const form = document.getElementById('doctorForm');
    form.dataset.editId = doctorId;

    document.getElementById('doctorModalTitle').innerHTML = `<i class="bi bi-pencil-square me-2 text-primary"></i> Edit Doctor: ${doctor.name}`;
    document.getElementById('doctorSubmitBtn').innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Update Doctor Details';

    document.getElementById('docName').value = doctor.name || '';
    document.getElementById('docSpecialization').value = doctor.specialization || '';
    document.getElementById('docDepartment').value = doctor.department || '';
    document.getElementById('docHospital').value = doctor.hospital || 'AIIMS New Delhi';
    document.getElementById('docExperience').value = doctor.experience || '5+ Yrs Exp';
    document.getElementById('docPhone').value = doctor.phone || '';
    document.getElementById('docEmail').value = doctor.email || '';
    document.getElementById('docFee').value = doctor.consultationFee || '₹500';
    document.getElementById('docAvailability').value = doctor.availability || 'Mon - Sat (09:00 AM - 05:00 PM)';
    document.getElementById('docBio').value = doctor.bio || '';

    const currentImg = resolveDoctorImg(doctor);
    setDoctorImagePreview(currentImg);
    document.getElementById('doctorImageInput').value = currentImg;
    document.getElementById('doctorPhotoFilename').value = '';

    // Highlight preset avatar if matching
    document.querySelectorAll('.preset-avatar-btn').forEach(b => {
        b.classList.toggle('selected', b.getAttribute('data-url') === doctor.image);
    });

    if (doctorModalInstance) doctorModalInstance.show();
};

// Submit Doctor Form (Create or Update)
const handleDoctorFormSubmit = async (e) => {
    e.preventDefault();

    const form = document.getElementById('doctorForm');
    const submitBtn = document.getElementById('doctorSubmitBtn');
    const editId = form.dataset.editId;

    const name = document.getElementById('docName').value.trim();
    const specialization = document.getElementById('docSpecialization').value.trim();
    const department = document.getElementById('docDepartment').value.trim();
    const hospital = document.getElementById('docHospital').value.trim();
    const experience = document.getElementById('docExperience').value.trim();
    const phone = document.getElementById('docPhone').value.trim();
    const email = document.getElementById('docEmail').value.trim();
    const consultationFee = document.getElementById('docFee').value.trim();
    const availability = document.getElementById('docAvailability').value.trim();
    const bio = document.getElementById('docBio').value.trim();

    let image = document.getElementById('doctorImageInput').value.trim();
    const filename = document.getElementById('doctorPhotoFilename').value.trim();

    if (!name || !specialization || !department || !phone || !email) {
        showToast('Please fill in all required fields (Name, Specialization, Dept, Phone, Email).', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving Doctor...';

    try {
        // If image is a base64 DataURL, upload it to the server first
        if (image.startsWith('data:image/')) {
            try {
                const uploadRes = await window.Auth.apiFetch('/api/admin/upload-image', {
                    method: 'POST',
                    body: JSON.stringify({ image, filename })
                });

                if (uploadRes.response.ok && uploadRes.data.success && uploadRes.data.url) {
                    image = uploadRes.data.url;
                }
            } catch (upErr) {
                console.warn('Image upload endpoint issue, will store inline image:', upErr);
            }
        }

        const payload = {
            name,
            specialization,
            department,
            hospital: hospital || 'AIIMS New Delhi',
            experience: experience || '5+ Yrs Exp',
            phone,
            email,
            consultationFee: consultationFee || '₹500',
            availability: availability || 'Mon - Sat (09:00 AM - 05:00 PM)',
            bio,
            image: image || '/images/male-doctor.jpg'
        };

        const url = editId ? `/api/doctors/${editId}` : '/api/doctors';
        const method = editId ? 'PUT' : 'POST';

        const { response, data } = await window.Auth.apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok && data.success) {
            showToast(editId ? `Doctor ${name} updated successfully!` : `Dr. ${name} added successfully!`, 'success');
            if (doctorModalInstance) doctorModalInstance.hide();
            await loadDoctors();
            await loadStats();
        } else {
            showToast(data.message || 'Error saving doctor details.', 'danger');
        }
    } catch (err) {
        console.error('Error saving doctor:', err);
        showToast('An unexpected network error occurred while saving doctor.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editId ? '<i class="bi bi-arrow-repeat me-1"></i> Update Doctor Details' : '<i class="bi bi-check-circle me-1"></i> Save Doctor';
    }
};

// Delete Doctor
window.confirmDeleteDoctor = async (doctorId, doctorName) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Doctor Profile',
        message: `Are you sure you want to remove Dr. ${doctorName}?`,
        subtext: 'This action will remove the doctor from the active specialist directory.',
        confirmText: 'Yes, Remove Doctor',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-person-x-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/doctors/${doctorId}`, {
            method: 'DELETE'
        });

        if (response.ok && data.success) {
            showToast(`Dr. ${doctorName} removed successfully.`, 'success');
            await loadDoctors();
            await loadStats();
        } else {
            showToast(data.message || 'Could not delete doctor.', 'danger');
        }
    } catch (err) {
        console.error('Error deleting doctor:', err);
        showToast('Network error while deleting doctor.', 'danger');
    }
};

// -----------------------------------------------------------------------------
// 3. APPOINTMENTS MANAGEMENT
// -----------------------------------------------------------------------------
const loadAppointments = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/appointments');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allAppointments = data.data;
            filterAppointments();
        }
    } catch (err) {
        console.error('Error fetching appointments:', err);
    }
};

const filterAppointments = () => {
    const status = document.getElementById('aptStatusFilter')?.value || '';
    const search = (document.getElementById('aptSearchInput')?.value || '').toLowerCase().trim();

    let filtered = allAppointments.filter(apt => {
        const patientName = apt.patient ? (apt.patient.name || apt.patient.email || '').toLowerCase() : '';
        const doctorName = apt.doctor ? (apt.doctor.name || '').toLowerCase() : '';
        const aptStatus = (apt.status || 'Confirmed').toLowerCase();

        const matchStatus = !status || aptStatus === status.toLowerCase();
        const matchSearch = !search || patientName.includes(search) || doctorName.includes(search);
        return matchStatus && matchSearch;
    });

    renderAppointments(filtered);
};
window.filterAppointments = filterAppointments;

const getStatusBadge = (status) => {
    const s = (status || 'Confirmed').toLowerCase();
    if (s === 'confirmed') return '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1"><i class="bi bi-check-circle-fill me-1"></i>Confirmed</span>';
    if (s === 'pending') return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1"><i class="bi bi-clock-history me-1"></i>Pending</span>';
    if (s === 'completed') return '<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1"><i class="bi bi-patch-check-fill me-1"></i>Completed</span>';
    if (s === 'cancelled') return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-1"><i class="bi bi-x-circle-fill me-1"></i>Cancelled</span>';
    return `<span class="badge bg-secondary rounded-pill px-3 py-1">${status}</span>`;
};

const getStatusBadgeConfig = (status) => {
    const s = (status || 'Confirmed').toLowerCase();
    switch (s) {
        case 'confirmed':
            return {
                btnClass: 'status-badge-confirmed',
                icon: 'bi-check-circle-fill',
                label: 'Confirmed'
            };
        case 'pending':
            return {
                btnClass: 'status-badge-pending',
                icon: 'bi-clock-history',
                label: 'Pending'
            };
        case 'completed':
            return {
                btnClass: 'status-badge-completed',
                icon: 'bi-patch-check-fill',
                label: 'Completed'
            };
        case 'cancelled':
            return {
                btnClass: 'status-badge-cancelled',
                icon: 'bi-x-circle-fill',
                label: 'Cancelled'
            };
        default:
            return {
                btnClass: 'status-badge-confirmed',
                icon: 'bi-check-circle-fill',
                label: status || 'Confirmed'
            };
    }
};

const renderStatusDropdown = (aptId, currentStatus) => {
    const activeCfg = getStatusBadgeConfig(currentStatus);
    const statuses = [
        { key: 'Confirmed', label: 'Confirmed', icon: 'bi-check-circle-fill', color: 'text-success' },
        { key: 'Pending', label: 'Pending', icon: 'bi-clock-history', color: 'text-warning' },
        { key: 'Completed', label: 'Completed', icon: 'bi-patch-check-fill', color: 'text-primary' },
        { key: 'Cancelled', label: 'Cancelled', icon: 'bi-x-circle-fill', color: 'text-danger' }
    ];

    const itemsHtml = statuses.map(s => {
        const isSelected = (currentStatus || 'Confirmed').toLowerCase() === s.key.toLowerCase();
        return `
            <li>
                <button type="button" 
                        class="dropdown-item ${isSelected ? 'active' : ''}" 
                        onclick="updateAppointmentStatus('${aptId}', '${s.key}')">
                    <span class="d-flex align-items-center gap-2">
                        <i class="bi ${s.icon} ${s.color}"></i>
                        <span class="${isSelected ? 'fw-bold' : ''}">${s.label}</span>
                    </span>
                    ${isSelected ? '<i class="bi bi-check2 text-primary fw-bold ms-2"></i>' : ''}
                </button>
            </li>
        `;
    }).join('');

    return `
        <div class="dropdown d-inline-block">
            <button class="btn btn-sm ${activeCfg.btnClass} status-badge-btn dropdown-toggle" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    data-bs-popper-config='{"strategy":"fixed"}'
                    aria-expanded="false" 
                    title="Click to change appointment status">
                <i class="bi ${activeCfg.icon}"></i>
                <span>${activeCfg.label}</span>
                <i class="bi bi-chevron-down ms-1" style="font-size: 0.65rem; opacity: 0.75;"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end status-dropdown-menu shadow-lg border-0">
                <li class="dropdown-header">Update Status</li>
                ${itemsHtml}
            </ul>
        </div>
    `;
};

const renderAppointments = (list) => {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No appointments found matching your criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(apt => {
        const patientName = apt.patient ? (apt.patient.name || apt.patient.email) : 'Patient';
        const patientPhone = apt.patient ? (apt.patient.phone || 'N/A') : 'N/A';
        const docName = apt.doctor ? (apt.doctor.name || 'Specialist') : 'Doctor';
        const docDept = apt.doctor ? (apt.doctor.department || '') : '';
        const currentStatus = apt.status || 'Confirmed';

        return `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${patientName}</div>
                    <small class="text-muted"><i class="bi bi-telephone me-1"></i>${patientPhone}</small>
                </td>
                <td>
                    <div class="fw-semibold text-primary">${docName}</div>
                    <small class="text-muted">${docDept}</small>
                </td>
                <td>
                    <div class="fw-semibold text-dark">${apt.appointmentDate || apt.date || 'TBD'}</div>
                    <small class="text-muted">${apt.appointmentTime || apt.time || '10:00 AM'}</small>
                </td>
                <td><small class="text-muted">${apt.reason || apt.notes || 'General Checkup'}</small></td>
                <td>
                    ${renderStatusDropdown(apt._id, currentStatus)}
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteAppointment('${apt._id}')" title="Cancel/Delete Appointment">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};
window.renderAppointments = renderAppointments;

window.updateAppointmentStatus = async (aptId, newStatus) => {
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok && data.success) {
            showToast(`Appointment status changed to ${newStatus}.`, 'success');
            await loadAppointments();
            await loadStats();
        } else {
            showToast(data.message || 'Could not update appointment status.', 'danger');
        }
    } catch (err) {
        console.error('Error updating appointment:', err);
    }
};

window.deleteAppointment = async (aptId) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Cancel Appointment',
        message: 'Are you sure you want to cancel and delete this appointment?',
        subtext: 'This visit will be removed from the clinic schedule.',
        confirmText: 'Yes, Cancel Appointment',
        cancelText: 'Keep Visit',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-calendar-x-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/appointments/${aptId}`, {
            method: 'DELETE'
        });
        if (response.ok && data.success) {
            showToast('Appointment removed successfully.', 'success');
            await loadAppointments();
            await loadStats();
        }
    } catch (err) {
        console.error('Error deleting appointment:', err);
    }
};

// -----------------------------------------------------------------------------
// 4. BLOOD DONORS MANAGEMENT
// -----------------------------------------------------------------------------
const loadDonors = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/donors');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allDonors = data.data;
            filterDonors();
        }
    } catch (err) {
        console.error('Error fetching donors:', err);
    }
};

const filterDonors = () => {
    const group = document.getElementById('donorGroupFilter')?.value || '';
    const search = (document.getElementById('donorSearchInput')?.value || '').toLowerCase().trim();

    let filtered = allDonors.filter(d => {
        const matchGroup = !group || (d.bloodGroup || '').toLowerCase() === group.toLowerCase();
        const matchSearch = !search ||
            (d.name || '').toLowerCase().includes(search) ||
            (d.location || '').toLowerCase().includes(search) ||
            (d.phone || '').includes(search);
        return matchGroup && matchSearch;
    });

    renderDonors(filtered);
};
window.filterDonors = filterDonors;

const renderDonors = (list) => {
    const tbody = document.getElementById('donorsTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No blood donors registered or matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(d => {
        const isAvail = (d.availability || 'Available').toLowerCase() === 'available';
        const availBadge = isAvail
            ? '<span class="badge bg-success-subtle text-success rounded-pill px-3 py-1">Available</span>'
            : '<span class="badge bg-secondary-subtle text-secondary rounded-pill px-3 py-1">Unavailable</span>';

        return `
            <tr>
                <td class="fw-bold text-dark">${d.name}</td>
                <td><span class="badge bg-danger rounded-pill px-3 py-1 fs-6">${d.bloodGroup}</span></td>
                <td><i class="bi bi-geo-alt me-1 text-danger"></i>${d.location}</td>
                <td><i class="bi bi-telephone me-1 text-muted"></i>${d.phone}</td>
                <td>${availBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary rounded-pill me-1" onclick="toggleDonorAvailability('${d._id}', '${isAvail ? 'Unavailable' : 'Available'}')">
                        ${isAvail ? 'Set Inactive' : 'Set Active'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteDonor('${d._id}', '${d.name}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};
window.renderDonors = renderDonors;

window.openAddDonorModal = () => {
    document.getElementById('addDonorForm')?.reset();
    if (addDonorModalInstance) addDonorModalInstance.show();
};

const handleDonorFormSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('donorName').value.trim();
    const bloodGroup = document.getElementById('donorBloodGroup').value;
    const location = document.getElementById('donorCity').value.trim();
    const phone = document.getElementById('donorPhone').value.trim();
    const email = document.getElementById('donorEmail').value.trim();

    if (!name || !bloodGroup || !location || !phone) {
        showToast('Please provide Donor Name, Blood Group, City, and Phone.', 'warning');
        return;
    }

    try {
        const { response, data } = await window.Auth.apiFetch('/api/donors', {
            method: 'POST',
            body: JSON.stringify({ name, bloodGroup, location, phone, email, availability: 'Available' })
        });

        if (response.ok && data.success) {
            showToast(`Blood donor ${name} added successfully!`, 'success');
            if (addDonorModalInstance) addDonorModalInstance.hide();
            await loadDonors();
            await loadStats();
        } else {
            showToast(data.message || 'Could not register blood donor.', 'danger');
        }
    } catch (err) {
        console.error('Error registering donor:', err);
    }
};

window.toggleDonorAvailability = async (donorId, newStatus) => {
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/donors/${donorId}`, {
            method: 'PUT',
            body: JSON.stringify({ availability: newStatus })
        });
        if (response.ok && data.success) {
            showToast(`Donor status updated to ${newStatus}.`, 'success');
            await loadDonors();
        }
    } catch (err) {
        console.error('Error updating donor:', err);
    }
};

window.deleteDonor = async (donorId, donorName) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Blood Donor',
        message: `Are you sure you want to remove donor ${donorName}?`,
        subtext: 'This donor will no longer appear in the emergency blood network.',
        confirmText: 'Yes, Remove Donor',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-droplet-slash',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/donors/${donorId}`, {
            method: 'DELETE'
        });
        if (response.ok && data.success) {
            showToast(`Donor ${donorName} removed.`, 'success');
            await loadDonors();
            await loadStats();
        }
    } catch (err) {
        console.error('Error deleting donor:', err);
    }
};

// -----------------------------------------------------------------------------
// 5. MEDICINES, WELLNESS & MEDICAL RECORDS
// -----------------------------------------------------------------------------
const loadMedicines = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/medicines');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allMedicines = data.data;
            renderMedicines(allMedicines);
        }
    } catch (err) {
        console.error('Error fetching medicines:', err);
    }
};

const renderMedicines = (list) => {
    const tbody = document.getElementById('medicinesTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No patient medicine schedules logged.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(m => `
        <tr>
            <td class="fw-bold text-dark"><i class="bi bi-capsule me-2 text-warning"></i>${m.medicineName || m.name}</td>
            <td><span class="badge bg-light text-dark border">${m.dosage || '1 dose'}</span></td>
            <td>${m.frequency || 'Daily'}</td>
            <td><i class="bi bi-clock me-1 text-muted"></i>${m.time || '08:00 AM'}</td>
            <td><small class="text-muted">${m.instructions || 'Take as advised'}</small></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteMedicine('${m._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.deleteMedicine = async (medId) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Medicine Reminder',
        message: 'Are you sure you want to remove this medicine reminder?',
        subtext: 'This medication schedule will be permanently deleted.',
        confirmText: 'Yes, Remove Reminder',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-capsule',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/medicines/${medId}`, { method: 'DELETE' });
        if (response.ok && data.success) {
            showToast('Medicine schedule deleted.', 'success');
            await loadMedicines();
            await loadStats();
        }
    } catch (err) {
        console.error('Error deleting medicine:', err);
    }
};

const loadWellness = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/wellness');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allWellness = data.data;
            renderWellness(allWellness);
        }
    } catch (err) {
        console.error('Error fetching wellness records:', err);
    }
};

const renderWellness = (list) => {
    const tbody = document.getElementById('wellnessTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No mental wellness diary entries recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(w => {
        const mood = w.mood || 'Calm';
        const moodBadge = mood.toLowerCase().includes('happy') ? '<span class="badge bg-success-subtle text-success rounded-pill px-3 py-1">😊 ' + mood + '</span>' :
                          mood.toLowerCase().includes('calm') ? '<span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">😌 ' + mood + '</span>' :
                          '<span class="badge bg-warning-subtle text-warning rounded-pill px-3 py-1">😐 ' + mood + '</span>';

        return `
            <tr>
                <td>${moodBadge}</td>
                <td><span class="badge bg-light text-dark border">${w.energyLevel || 'Moderate'}</span></td>
                <td><i class="bi bi-moon-stars me-1 text-primary"></i>${w.sleepHours || 7} hrs</td>
                <td><small class="text-muted">${w.notes || 'No comments'}</small></td>
                <td><small class="text-muted">${w.date || new Date(w.createdAt).toLocaleDateString()}</small></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteWellness('${w._id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.deleteWellness = async (wellId) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Wellness Log',
        message: 'Are you sure you want to remove this wellness log?',
        subtext: 'This mood entry will be removed from mental wellness records.',
        confirmText: 'Yes, Remove Log',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-emoji-frown-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/wellness/${wellId}`, { method: 'DELETE' });
        if (response.ok && data.success) {
            showToast('Wellness record deleted.', 'success');
            await loadWellness();
            await loadStats();
        }
    } catch (err) {
        console.error('Error deleting wellness:', err);
    }
};

const loadMedicalRecords = async () => {
    try {
        const { response, data } = await window.Auth.apiFetch('/api/records');
        if (response.ok && data.success && Array.isArray(data.data)) {
            allRecords = data.data;
            renderMedicalRecords(allRecords);
        }
    } catch (err) {
        console.error('Error fetching medical records:', err);
    }
};

const renderMedicalRecords = (list) => {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No medical clinical records available.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(r => {
        const patientName = r.patient ? (r.patient.name || r.patient.email) : 'Patient';
        return `
            <tr>
                <td class="fw-bold text-dark">${patientName}</td>
                <td class="fw-semibold text-primary"><i class="bi bi-journal-medical me-2"></i>${r.diagnosis}</td>
                <td>${r.doctorName || 'Attending Physician'}</td>
                <td><small class="text-muted">${r.hospital || 'AIIMS'}</small></td>
                <td><small class="text-muted">${r.treatment || 'Prescribed regimen'}</small></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteMedicalRecord('${r._id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.deleteMedicalRecord = async (recId) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Delete Medical Record',
        message: 'Are you sure you want to delete this clinical dossier?',
        subtext: 'The diagnostic and prescription history will be removed.',
        confirmText: 'Yes, Delete Record',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-file-earmark-x-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/records/${recId}`, { method: 'DELETE' });
        if (response.ok && data.success) {
            showToast('Medical record deleted.', 'success');
            await loadMedicalRecords();
            await loadStats();
        }
    } catch (err) {
        console.error('Error deleting record:', err);
    }
};

// -----------------------------------------------------------------------------
// 6. USER ACCOUNTS & ROLE MANAGEMENT
// -----------------------------------------------------------------------------
const loadUsers = async () => {
    // Show loading state in the table
    const tbody = document.getElementById('usersTableBody');
    if (tbody && allUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading users...</td></tr>`;
    }
    try {
        const { response, data } = await window.Auth.apiFetch('/api/admin/users');
        console.log('[Admin] /api/admin/users response:', response.status, data?.success, 'count:', data?.count);
        if (response.ok && data.success && Array.isArray(data.data)) {
            allUsers = data.data;
            console.log('[Admin] allUsers updated, count:', allUsers.length);
            filterUsers();
        } else {
            console.warn('[Admin] loadUsers: unexpected response', data);
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger">Failed to load users. Please refresh.</td></tr>`;
        }
    } catch (err) {
        console.error('[Admin] Error fetching users:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger">Error loading users: ${err.message}</td></tr>`;
    }
};

const filterUsers = () => {
    const search = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
    let filtered = allUsers.filter(u => {
        return !search ||
            (u.name || '').toLowerCase().includes(search) ||
            (u.email || '').toLowerCase().includes(search) ||
            (u.role || '').toLowerCase().includes(search);
    });
    renderUsers(filtered);
};
window.filterUsers = filterUsers;
window.loadUsers = loadUsers;

const getRoleBadgeConfig = (role) => {
    const r = (role || 'Patient').toLowerCase();
    switch (r) {
        case 'admin':
            return {
                btnClass: 'role-badge-admin',
                icon: 'bi-shield-shaded',
                label: 'Admin'
            };
        case 'doctor':
            return {
                btnClass: 'role-badge-doctor',
                icon: 'bi-person-badge-fill',
                label: 'Doctor'
            };
        case 'patient':
        default:
            return {
                btnClass: 'role-badge-patient',
                icon: 'bi-person-fill',
                label: 'Patient'
            };
    }
};

const renderRoleSelector = (userId, userName, currentRole) => {
    const role = currentRole || 'Patient';
    const isPatient = role === 'Patient';
    const isDoctor = role === 'Doctor';
    const isAdmin = role === 'Admin';
    const safeName = String(userName || 'User').replace(/['"<>]/g, '');

    return `
        <div class="role-segmented-pill" role="group" aria-label="Role selector">
            <button type="button" 
                    class="role-pill-btn ${isPatient ? 'active patient' : ''}" 
                    ${isPatient ? 'disabled' : `onclick="promptChangeRole('${userId}', '${safeName}', 'Patient')"`}
                    title="${isPatient ? 'Active role: Patient' : 'Assign Patient Role'}">
                <i class="bi bi-person-fill"></i>
                <span>Patient</span>
            </button>
            <button type="button" 
                    class="role-pill-btn ${isDoctor ? 'active doctor' : ''}" 
                    ${isDoctor ? 'disabled' : `onclick="promptChangeRole('${userId}', '${safeName}', 'Doctor')"`}
                    title="${isDoctor ? 'Active role: Doctor' : 'Promote to Doctor Role'}">
                <i class="bi bi-hospital"></i>
                <span>Doctor</span>
            </button>
            <button type="button" 
                    class="role-pill-btn ${isAdmin ? 'active admin' : ''}" 
                    ${isAdmin ? 'disabled' : `onclick="promptChangeRole('${userId}', '${safeName}', 'Admin')"`}
                    title="${isAdmin ? 'Active role: Administrator' : 'Promote to Administrator Role'}">
                <i class="bi bi-shield-shaded"></i>
                <span>Admin</span>
            </button>
        </div>
    `;
};

const renderUsers = (list) => {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">No users found.</td></tr>`;
        return;
    }

    const currentAuthUser = window.Auth ? window.Auth.getCurrentUser() : null;

    tbody.innerHTML = list.map(u => {
        const isCurrent = currentAuthUser && (currentAuthUser.email === u.email || currentAuthUser.id === u._id || currentAuthUser._id === u._id);
        const safeName = String(u.name || 'User').replace(/['"<>]/g, '');

        return `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${safeName} ${isCurrent ? '<span class="badge bg-secondary-subtle text-secondary ms-1">You</span>' : ''}</div>
                    <small class="text-muted">${(u.phone && String(u.phone).trim() && String(u.phone).trim() !== 'Not specified') ? String(u.phone).trim() : '<span class="text-secondary fst-italic">No phone added</span>'}</small>
                </td>
                <td class="text-dark small">${u.email}</td>
                <td>
                    ${renderRoleSelector(u._id, safeName, u.role)}
                </td>
                <td class="small text-muted">${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                <td class="text-end">
                    ${isCurrent ? `
                        <span class="badge bg-secondary-subtle text-secondary border rounded-pill px-3 py-1 fw-semibold">
                            <i class="bi bi-person-check-fill me-1"></i> Active Admin
                        </span>
                    ` : `
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 fw-bold shadow-sm d-inline-flex align-items-center gap-1" 
                                onclick="deleteUserAccount('${u._id}', '${safeName}')"
                                title="Permanently delete user account">
                            <i class="bi bi-trash3-fill"></i> Delete
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
};
window.renderUsers = renderUsers;

let assignDoctorModalInstance = null;

const specDeptMap = {
    'Cardiologist': 'Cardiology',
    'Neurologist': 'Neurology',
    'General Physician': 'Internal Medicine',
    'Orthopedic': 'Orthopedics',
    'Pediatrician': 'Pediatrics',
    'Dermatologist': 'Dermatology',
    'Oncologist': 'Oncology',
    'Psychiatrist': 'Psychiatry',
    'ENT Specialist': 'Otolaryngology',
    'Gynecologist': 'Gynecology'
};

window.openAssignDoctorModal = (userId, userName) => {
    const modalEl = document.getElementById('assignDoctorModal');
    if (!modalEl) return;
    if (!assignDoctorModalInstance && window.bootstrap && window.bootstrap.Modal) {
        assignDoctorModalInstance = new bootstrap.Modal(modalEl);
    }

    const user = (allUsers || []).find(u => u._id === userId || u.id === userId) || {};

    const userIdEl = document.getElementById('assignDoctorUserId');
    const userEmailEl = document.getElementById('assignDoctorUserEmail');
    const nameEl = document.getElementById('assignDoctorName');
    const phoneEl = document.getElementById('assignDoctorPhone');
    const expEl = document.getElementById('assignDoctorExperience');
    const specEl = document.getElementById('assignDoctorSpecialization');
    const deptEl = document.getElementById('assignDoctorDepartment');
    const hospEl = document.getElementById('assignDoctorHospital');
    const imageInput = document.getElementById('assignDoctorImageInput');
    const previewEl = document.getElementById('assignDoctorImagePreview');
    const fileInput = document.getElementById('assignDoctorPhotoFileInput');

    if (userIdEl) userIdEl.value = userId;
    if (userEmailEl) userEmailEl.value = user.email || '';

    const cleanName = (userName || user.name || '').replace(/^Dr\.\s*/i, '').trim();
    if (nameEl) nameEl.value = cleanName ? `Dr. ${cleanName}` : 'Dr. ';

    const rawPhone = user.phone ? String(user.phone).trim() : '';
    if (phoneEl) phoneEl.value = (rawPhone && rawPhone !== 'Not specified') ? rawPhone : '';

    if (expEl) expEl.value = user.experience || '5+ Yrs Exp';

    if (specEl) {
        specEl.value = user.specialization || 'General Physician';
        specEl.onchange = () => {
            if (deptEl) deptEl.value = specDeptMap[specEl.value] || 'General Medicine';
        };
    }
    if (deptEl) deptEl.value = user.department || (specEl ? specDeptMap[specEl.value] : 'Internal Medicine') || 'Internal Medicine';
    if (hospEl) hospEl.value = user.hospital || 'AIIMS New Delhi';

    const defaultImg = user.avatar || '/images/male-doctor.jpg';
    if (imageInput) imageInput.value = defaultImg;
    if (previewEl) previewEl.src = defaultImg;
    if (fileInput) fileInput.value = '';

    if (assignDoctorModalInstance) assignDoctorModalInstance.show();
};

const setupAssignDoctorPhotoUpload = () => {
    const fileInput = document.getElementById('assignDoctorPhotoFileInput');
    const previewEl = document.getElementById('assignDoctorImagePreview');
    const hiddenInput = document.getElementById('assignDoctorImageInput');
    const dropzone = document.getElementById('assignDoctorDropzone');

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
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
                    showToast('Doctor photo uploaded successfully!', 'success');
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
};

const setupAssignDoctorForm = () => {
    const form = document.getElementById('assignDoctorForm');
    if (!form || form._curemedInit) return;
    form._curemedInit = true;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('assignDoctorSubmitBtn');
        const userId = document.getElementById('assignDoctorUserId').value;
        const name = document.getElementById('assignDoctorName').value.trim();
        const phone = document.getElementById('assignDoctorPhone').value.trim();
        const experience = document.getElementById('assignDoctorExperience').value.trim();
        const specialization = document.getElementById('assignDoctorSpecialization').value;
        const department = document.getElementById('assignDoctorDepartment').value.trim() || 'Internal Medicine';
        const hospital = document.getElementById('assignDoctorHospital').value.trim() || 'AIIMS New Delhi';
        const image = document.getElementById('assignDoctorImageInput').value;

        if (!name) {
            showToast('Please provide Doctor Name.', 'warning');
            return;
        }
        if (!phone) {
            showToast('Please provide Contact Phone number.', 'warning');
            return;
        }
        if (!experience) {
            showToast('Please provide Years of Experience.', 'warning');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving Doctor...';
        }

        try {
            const { response, data } = await window.Auth.apiFetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({
                    role: 'Doctor',
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
                if (assignDoctorModalInstance) assignDoctorModalInstance.hide();
                showToast(`Doctor Console access granted: ${name} configured with ${experience} of experience.`, 'success');

                const currentAuthUser = window.Auth ? window.Auth.getCurrentUser() : null;
                if (currentAuthUser && (currentAuthUser.id === userId || currentAuthUser._id === userId || currentAuthUser.email === data.user?.email)) {
                    if (data.user) {
                        window.Auth.login(window.Auth.getToken(), data.user);
                        window.Auth.renderNavbarAuth();
                    }
                }

                if (window.Auth && window.Auth.broadcastRoleChange) {
                    window.Auth.broadcastRoleChange(userId, 'Doctor');
                }

                await loadUsers();
                await loadDoctors();
                await loadStats();
            } else {
                showToast(data.message || 'Could not assign Doctor role.', 'danger');
            }
        } catch (err) {
            console.error('Error assigning doctor role:', err);
            showToast('Error assigning doctor role: ' + (err.message || 'Network error'), 'danger');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Save & Grant Doctor Access';
            }
        }
    });
};

window.promptChangeRole = async (userId, userName, targetRole) => {
    if (!userId || !targetRole) return;

    // When giving Doctor Panel to user, ask for Photo to upload, Name, Phone, and Experience
    if (targetRole === 'Doctor') {
        openAssignDoctorModal(userId, userName);
        return;
    }

    let title = 'Change User Role';
    let message = `Assign the role of ${targetRole} to ${userName}?`;
    let subtext = '';
    let confirmText = `Assign ${targetRole}`;
    let confirmBtnClass = 'btn-primary';
    let icon = 'bi-person-fill';
    let iconColor = 'text-primary';
    let iconBg = 'bg-primary-subtle';

    if (targetRole === 'Admin') {
        title = 'Grant Administrator Role';
        message = `Promote ${userName} to full System Administrator?`;
        subtext = 'Administrators have complete platform authority over all doctors, appointments, users, and platform settings.';
        confirmText = 'Yes, Grant Full Admin';
        confirmBtnClass = 'btn-danger';
        icon = 'bi-shield-shaded';
        iconColor = 'text-danger';
        iconBg = 'bg-danger-subtle';
    } else {
        title = 'Assign Patient Role';
        message = `Change ${userName}'s role back to Patient?`;
        subtext = 'Doctor Dashboard and administrative permissions will be revoked for this account.';
        confirmText = 'Yes, Set as Patient';
        confirmBtnClass = 'btn-success';
        icon = 'bi-person-fill';
        iconColor = 'text-success';
        iconBg = 'bg-success-subtle';
    }

    if (typeof window.showConfirmDialog !== 'function') {
        await changeUserRole(userId, targetRole);
        return;
    }

    const confirmed = await window.showConfirmDialog({
        title,
        message,
        subtext,
        confirmText,
        cancelText: 'Cancel',
        confirmBtnClass,
        icon,
        iconColor,
        iconBg
    });

    if (!confirmed) return;

    await changeUserRole(userId, targetRole);
};

window.toggleDoctorPermission = async (userId, grant) => {
    // When granting Doctor Panel permission, ask for Photo to upload, Name, Phone, and Experience
    if (grant) {
        const user = (allUsers || []).find(u => u._id === userId || u.id === userId) || {};
        openAssignDoctorModal(userId, user.name || 'User');
        return;
    }

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/admin/users/${userId}/doctor-permission`, {
            method: 'PUT',
            body: JSON.stringify({ doctorAccess: grant })
        });
        if (response.ok && data.success) {
            showToast('Doctor Console access revoked for this user.', 'success');

            const currentAuthUser = window.Auth ? window.Auth.getCurrentUser() : null;
            if (currentAuthUser && (currentAuthUser.id === userId || currentAuthUser._id === userId || currentAuthUser.email === userId || currentAuthUser.email === data.user?.email)) {
                if (data.user) {
                    window.Auth.login(window.Auth.getToken(), data.user);
                    window.Auth.renderNavbarAuth();
                }
            }

            if (window.Auth && window.Auth.broadcastRoleChange) {
                window.Auth.broadcastRoleChange(userId, 'Patient');
            }

            await loadUsers();
            await loadStats();
        } else {
            showToast(data.message || 'Could not update Doctor permission.', 'danger');
        }
    } catch (err) {
        console.error('Error toggling doctor permission:', err);
        showToast('Error updating permission.', 'danger');
    }
};

window.changeUserRole = async (userId, newRole) => {
    try {
        const { response, data } = await window.Auth.apiFetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        if (response.ok && data.success) {
            let roleMsg = `User role changed to ${newRole}.`;
            if (newRole === 'Doctor') {
                roleMsg = 'User promoted to Doctor. Doctor Console access is now enabled.';
            } else if (newRole === 'Admin') {
                roleMsg = 'User promoted to Administrator with full platform access.';
            } else if (newRole === 'Patient') {
                roleMsg = 'User role set to Patient.';
            }
            showToast(roleMsg, 'success');

            // If updated user is currently logged in, update active session immediately
            const currentAuthUser = window.Auth ? window.Auth.getCurrentUser() : null;
            if (currentAuthUser && (currentAuthUser.id === userId || currentAuthUser._id === userId || currentAuthUser.email === userId || currentAuthUser.email === data.user?.email)) {
                if (data.user) {
                    window.Auth.login(window.Auth.getToken(), data.user);
                    window.Auth.renderNavbarAuth();
                }
            }

            // Broadcast update across open tabs
            if (window.Auth && window.Auth.broadcastRoleChange) {
                window.Auth.broadcastRoleChange(userId, newRole);
            }

            await loadUsers();
            await loadStats();
        } else {
            showToast(data.message || 'Could not update user role.', 'danger');
            await loadUsers();
        }
    } catch (err) {
        console.error('Error updating role:', err);
        showToast('Error updating role: ' + (err.message || 'Network error'), 'danger');
        await loadUsers();
    }
};

window.deleteUserAccount = async (userId, userName) => {
    if (!userId) {
        showToast('Error: User ID is required.', 'danger');
        return;
    }

    const currentAuthUser = window.Auth ? window.Auth.getCurrentUser() : null;
    if (currentAuthUser && (currentAuthUser.id === userId || currentAuthUser._id === userId || currentAuthUser.email === userId)) {
        showToast('You cannot delete your own active administrator account!', 'danger');
        return;
    }

    if (typeof window.showConfirmDialog !== 'function') {
        showToast('Confirmation dialog is unavailable.', 'danger');
        return;
    }

    const confirmed = await window.showConfirmDialog({
        title: 'Delete User Account',
        message: `Permanently delete the user account for ${userName}?`,
        subtext: 'This user account, access permissions, and session tokens will be permanently removed. This action cannot be undone.',
        confirmText: 'Yes, Delete Account',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-trash3-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });

    if (!confirmed) return;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (response.ok && data.success) {
            showToast(`User account for "${userName}" deleted successfully.`, 'success');
            await loadUsers();
            await loadStats();
        } else {
            showToast(data.message || 'Could not delete user.', 'danger');
        }
    } catch (err) {
        console.error('Error deleting user:', err);
        showToast('Failed to delete user: ' + (err.message || 'Network error'), 'danger');
    }
};

// Note: User list is loaded when switching to Users tab or clicking the dedicated Refresh button

// Simple debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Render all tabs immediately from memory so UI is rich from the start
const renderAllPanes = () => {
    try {
        if (typeof renderDoctors === 'function') renderDoctors(allDoctors);
        if (typeof renderAppointments === 'function') renderAppointments(allAppointments);
        if (typeof renderDonors === 'function') renderDonors(allDonors);
        if (typeof renderMedicines === 'function') renderMedicines(allMedicines);
        if (typeof renderWellness === 'function') renderWellness(allWellness);
        if (typeof renderMedicalRecords === 'function') renderMedicalRecords(allRecords);
        if (typeof renderUsers === 'function') renderUsers(allUsers);
    } catch (e) {
        console.warn('Initial render error:', e);
    }
};

// Initialize Admin UI
const initAdmin = async () => {
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    if (currentUser) {
        const adminNameEl = document.getElementById('adminCurrentName');
        const adminEmailEl = document.getElementById('adminCurrentEmail');
        const adminAvatarLetter = document.getElementById('adminAvatarLetter');
        if (adminNameEl) adminNameEl.textContent = currentUser.name || 'Admin';
        if (adminEmailEl) adminEmailEl.textContent = currentUser.email || '';
        if (adminAvatarLetter) adminAvatarLetter.textContent = (currentUser.name || 'A').charAt(0).toUpperCase();
    }

    // Initialize Bootstrap Modals
    if (window.bootstrap && window.bootstrap.Modal) {
        const docModalEl = document.getElementById('doctorModal');
        if (docModalEl) doctorModalInstance = new bootstrap.Modal(docModalEl);

        const donorModalEl = document.getElementById('addDonorModal');
        if (donorModalEl) addDonorModalInstance = new bootstrap.Modal(donorModalEl);

        const assignDocModalEl = document.getElementById('assignDoctorModal');
        if (assignDocModalEl) assignDoctorModalInstance = new bootstrap.Modal(assignDocModalEl);
    }

    setupAssignDoctorPhotoUpload();
    setupAssignDoctorForm();

    // Sidebar navigation click handlers
    document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = btn.getAttribute('data-tab');
            if (window.switchTab) {
                window.switchTab(tab);
            }
        });
    });

    // Mobile sidebar toggle
    document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
        document.getElementById('adminSidebar')?.classList.toggle('show');
        document.getElementById('adminBackdrop')?.classList.toggle('show');
    });

    document.getElementById('adminBackdrop')?.addEventListener('click', closeMobileSidebar);

    // Preset avatars in modal
    renderPresetAvatars();

    // Doctor Image Uploader & Dropzone Event Listeners
    setupImageUploadHandlers();

    // Doctor Search & Filters
    document.getElementById('doctorSearchInput')?.addEventListener('input', debounce(filterDoctors, 250));
    document.getElementById('doctorSpecFilter')?.addEventListener('change', filterDoctors);
    document.getElementById('btnViewGrid')?.addEventListener('click', () => setDoctorView('grid'));
    document.getElementById('btnViewTable')?.addEventListener('click', () => setDoctorView('table'));

    // Appointment Filters
    document.getElementById('aptStatusFilter')?.addEventListener('change', filterAppointments);
    document.getElementById('aptSearchInput')?.addEventListener('input', debounce(filterAppointments, 250));

    // Donor Filters
    document.getElementById('donorGroupFilter')?.addEventListener('change', filterDonors);
    document.getElementById('donorSearchInput')?.addEventListener('input', debounce(filterDonors, 250));

    // Users Search
    document.getElementById('userSearchInput')?.addEventListener('input', debounce(filterUsers, 250));

    // Form Submissions
    document.getElementById('doctorForm')?.addEventListener('submit', handleDoctorFormSubmit);
    document.getElementById('addDonorForm')?.addEventListener('submit', handleDonorFormSubmit);

    // Render all initial panes immediately
    renderAllPanes();

    // Check admin authentication
    if (window.Auth && !(await window.Auth.requireAdmin())) {
        return;
    }

    // Live background fetch from server
    await refreshAllData();

    // Restore saved active tab after initial render & fetch
    const activeTab = (typeof window.getSavedAdminTab === 'function') 
        ? window.getSavedAdminTab() 
        : ((window.location.hash || '').replace('#', '').trim() || localStorage.getItem('admin_active_tab') || 'dashboard');
    if (activeTab && window.switchTab) {
        window.switchTab(activeTab);
    }
};

// Listen to browser navigation/hash changes
window.addEventListener('hashchange', () => {
    const tab = (window.location.hash || '').replace('#', '').trim();
    if (tab && window.switchTab) {
        window.switchTab(tab);
    }
});

// Safe lifecycle runner (handles cases where DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}
