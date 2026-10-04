/**
 * ============================================================================
 * Hospital Appointments Module (ES6)
 * Satisfies Q5, Q6, Q7, Q9 (fetch, async/await, CRUD operations)
 * ============================================================================
 */

const defaultFallbackDoctors = [];

// Helper to resolve doctor avatar image
const getDoctorImage = (doc) => {
    if (doc && doc.image) {
        if (doc.image.startsWith('http://') || doc.image.startsWith('https://') || doc.image.startsWith('/') || doc.image.startsWith('data:')) {
            return doc.image;
        }
        return '/' + doc.image.replace(/^\.\.\//, '').replace(/^\.\//, '');
    }
    return '/images/male-doctor.jpg';
};

// 1. Fetch & display doctors for doctors.html and book.html
const loadDoctors = async (filter = {}) => {
    try {
        let url = '/api/doctors';
        const params = new URLSearchParams();
        if (filter.specialization) params.append('specialization', filter.specialization);
        if (filter.search) params.append('search', filter.search);
        if (params.toString()) url += `?${params.toString()}`;

        const { response, data } = await window.Auth.apiFetch(url);
        if (response && response.ok && data && Array.isArray(data.data)) {
            return data.data;
        }
    } catch (error) {
        console.warn('loadDoctors API fetch failed:', error);
    }
    return [];
};

// 2. Populate Doctor Cards on doctors.html
const renderDoctorsList = async () => {
    const container = document.getElementById('doctorsContainer');
    if (!container) return;

    const searchInput = document.getElementById('doctorSearch');
    const specSelect = document.getElementById('specializationFilter');

    const search = searchInput ? searchInput.value.trim() : '';
    const specialization = specSelect ? specSelect.value : '';

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading doctors...</span>
            </div>
            <p class="mt-2 text-muted">Loading available doctors...</p>
        </div>
    `;

    const doctors = await loadDoctors({ search, specialization });

    if (doctors.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i> No doctors found matching the selected criteria.
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = doctors.map(doc => {
        const imgSrc = getDoctorImage(doc);
        const avatarHtml = imgSrc
            ? `<img src="${imgSrc}" alt="${doc.name}" class="rounded-circle object-fit-cover shadow-sm border border-2 border-white" style="width: 58px; height: 58px; min-width: 58px;">`
            : `<div class="rounded-circle bg-primary-subtle text-primary p-3 d-flex align-items-center justify-content-center" style="width: 58px; height: 58px; min-width: 58px;"><i class="bi bi-person-fill fs-3"></i></div>`;

        return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="team-item-card h-100 d-flex flex-column text-start">
                <div class="p-3 bg-light border-bottom d-flex align-items-center gap-3">
                    ${avatarHtml}
                    <div>
                        <h5 class="fw-bold mb-1 fs-6">${doc.name}</h5>
                        <span class="badge bg-primary text-white rounded-pill px-3 py-1 small">${doc.specialization}</span>
                    </div>
                </div>
                <div class="p-4 flex-grow-1">
                    <ul class="list-unstyled mb-0">
                        <li class="mb-2 text-muted small">
                            <i class="bi bi-building me-2 text-primary"></i> <strong class="text-dark">Department:</strong> ${doc.department}
                        </li>
                        <li class="mb-2 text-muted small">
                            <i class="bi bi-telephone me-2 text-primary"></i> <strong class="text-dark">Phone:</strong> ${doc.phone || '+91 98765 01001'}
                        </li>
                        <li class="text-muted small">
                            <i class="bi bi-envelope me-2 text-primary"></i> <strong class="text-dark">Email:</strong> ${doc.email || 'doctor@hospital.in'}
                        </li>
                    </ul>
                </div>
                <div class="p-3 bg-light border-top text-end">
                    <a href="book.html?doctorId=${doc._id}" class="primary-button btn-sm w-100 justify-content-center">
                        <i class="bi bi-calendar-check me-1"></i> Book Appointment
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('');
};

// 3. Populate Doctor Select dropdown on book.html
const populateDoctorSelect = async () => {
    const select = document.getElementById('doctorSelect');
    if (!select) return;

    const urlParams = new URLSearchParams(window.location.search);
    let preselectedId = urlParams.get('doctorId') || urlParams.get('doctor');

    // Robust regex fallback for malformed URLs (e.g. ?doctorId-doc_002 or ?doctorId:doc_002 or ?doc_002)
    if (!preselectedId) {
        const match = window.location.search.match(/doctor(?:Id)?[-=:]\s*([a-zA-Z0-9_-]+)/i);
        if (match) {
            preselectedId = match[1];
        } else {
            const docMatch = window.location.search.match(/(doc_\d+)/i);
            if (docMatch) preselectedId = docMatch[1];
        }
    }

    const doctors = await loadDoctors();
    if (!doctors || doctors.length === 0) {
        select.innerHTML = '<option value="">-- No Specialist Doctors Currently Available --</option>';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }
    select.innerHTML = '<option value="">-- Choose a Specialist Doctor --</option>' +
        doctors.map(d => {
            const img = getDoctorImage(d);
            return `
            <option value="${d._id}" data-image="${img}" data-specialization="${d.specialization || ''}" data-department="${d.department || ''}" ${preselectedId === d._id ? 'selected' : ''}>
                ${d.name} (${d.specialization} - ${d.department})
            </option>`;
        }).join('');

    if (preselectedId) {
        const foundIndex = doctors.findIndex(d => d._id === preselectedId);
        if (foundIndex !== -1) {
            select.selectedIndex = foundIndex + 1;
            select.value = preselectedId;
        }
    }

    select.dispatchEvent(new Event('change', { bubbles: true }));
};

// 4. Handle Book Appointment Form Submission
const handleBookAppointment = async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('appointmentAlert');
    alertBox.classList.add('d-none');

    const form = e.target;
    
    // Robust extraction with fallbacks for native and custom select components
    const doctorSelect = document.getElementById('doctorSelect') || form.doctor;
    let doctor = doctorSelect ? doctorSelect.value : '';
    if (!doctor && doctorSelect && doctorSelect.selectedIndex > 0) {
        doctor = doctorSelect.options[doctorSelect.selectedIndex]?.value || '';
    }
    if (!doctor) {
        const customOpt = doctorSelect?.closest('.curemed-select-wrapper, .input-group')?.querySelector('.curemed-select-option.selected');
        if (customOpt && customOpt.dataset.value) {
            doctor = customOpt.dataset.value;
        }
    }
    if (!doctor) {
        const match = window.location.search.match(/doctor(?:Id)?[-=:]\s*([a-zA-Z0-9_-]+)/i) || window.location.search.match(/(doc_\d+)/i);
        if (match) doctor = match[1];
    }

    const dateInput = document.getElementById('appointmentDate') || form.appointmentDate;
    let appointmentDate = (dateInput ? dateInput.value : '').trim();
    if (!appointmentDate) {
        appointmentDate = new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = appointmentDate;
    }

    const timeSelect = document.getElementById('appointmentTime') || form.appointmentTime;
    let appointmentTime = timeSelect ? timeSelect.value : '';
    if (!appointmentTime && timeSelect && timeSelect.selectedIndex > 0) {
        appointmentTime = timeSelect.options[timeSelect.selectedIndex]?.value || '';
    }
    if (!appointmentTime) {
        const customTime = timeSelect?.closest('.curemed-select-wrapper, .input-group')?.querySelector('.curemed-select-option.selected');
        if (customTime && customTime.dataset.value) {
            appointmentTime = customTime.dataset.value;
        }
    }
    if (!appointmentTime) {
        appointmentTime = '10:00 AM';
    }

    if (!doctor) {
        doctor = new URLSearchParams(window.location.search).get('doctorId') || '';
    }

    const reasonInput = document.getElementById('reason') || form.reason;
    const reason = (reasonInput ? reasonInput.value : '').trim() || 'General Medical Consultation';

    // Validation
    const { isValid, errors } = window.Validator.validateAppointment({
        doctor,
        appointmentDate,
        appointmentTime,
        reason
    });

    window.Validator.resetFormValidation(form);

    if (!isValid) {
        Object.entries(errors).forEach(([field, msg]) => {
            const input = form[field] || document.getElementById(field) || document.querySelector(`[name="${field}"]`);
            if (input) window.Validator.setFieldError(input, msg);
        });
        return;
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Booking...';

        const { response, data } = await window.Auth.apiFetch('/api/appointments', {
            method: 'POST',
            body: JSON.stringify({
                doctor,
                doctorId: doctor,
                doctor_id: doctor,
                date: appointmentDate,
                appointmentDate,
                appointment_date: appointmentDate,
                time: appointmentTime,
                appointmentTime,
                appointment_time: appointmentTime,
                notes: reason,
                reason,
                symptoms: reason
            })
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Confirm Appointment';

        if (!response.ok) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${data.message || 'Failed to book appointment'}`;
            alertBox.classList.remove('d-none');
            return;
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Appointment successfully booked! Redirecting to My Appointments...`;
        alertBox.classList.remove('d-none');

        form.reset();
        setTimeout(() => {
            window.location.href = 'appointments.html';
        }, 1500);
    } catch (error) {
        console.error('Book Appointment Error:', error);
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> An unexpected error occurred. Please try again.';
        alertBox.classList.remove('d-none');
    }
};

// 5. Render Appointments Table on appointments.html
const renderAppointmentsTable = async () => {
    const tableBody = document.getElementById('appointmentsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted mt-2">Loading appointments...</div>
            </td>
        </tr>
    `;

    try {
        const { response, data } = await window.Auth.apiFetch('/api/appointments');
        if (!response.ok) throw new Error(data.message);

        const appointments = data.data || [];
        const user = window.Auth.getCurrentUser();

        if (appointments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <i class="bi bi-calendar-x fs-1 d-block mb-2 text-secondary"></i>
                        No appointments found. <a href="book.html" class="fw-bold">Book an appointment now</a>.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = appointments.map((apt, index) => {
            const statusClasses = {
                Pending: 'status-pending',
                Confirmed: 'status-confirmed',
                Completed: 'status-completed',
                Cancelled: 'status-cancelled'
            };
            const badgeClass = statusClasses[apt.status] || 'status-confirmed';
            const aptDate = apt.appointmentDate || apt.date || 'N/A';
            const aptTime = apt.appointmentTime || apt.time || 'N/A';
            const aptReason = (apt.reason || apt.notes || 'General Consultation').replace(/'/g, "\\'");

            return `
                <tr>
                    <td class="fw-bold text-secondary">${index + 1}</td>
                    <td>
                        <div class="fw-bold">${apt.doctor ? apt.doctor.name : 'Consulting Doctor'}</div>
                        <small class="text-muted">${apt.doctor ? (apt.doctor.specialization || apt.doctor.department || '') : ''}</small>
                    </td>
                    <td>
                        <div><i class="bi bi-calendar-event me-1 text-primary"></i> ${aptDate}</div>
                        <small class="text-muted"><i class="bi bi-clock me-1 text-primary"></i> ${aptTime}</small>
                    </td>
                    <td>
                        <span class="badge badge-status ${badgeClass}">${apt.status || 'Confirmed'}</span>
                    </td>
                    <td class="text-truncate" style="max-width: 200px;" title="${apt.reason || apt.notes || ''}">
                        ${apt.reason || apt.notes || 'General Consultation'}
                    </td>
                    <td>
                        <div class="text-secondary small">
                            ${apt.patient ? apt.patient.name : (user ? user.name : 'Patient')}
                        </div>
                    </td>
                    <td class="text-end">
                        <div class="btn-group btn-action-group">
                            <button class="btn btn-outline-primary btn-sm" onclick="openEditAppointmentModal('${apt._id}', '${aptDate}', '${aptTime}', '${apt.status || 'Confirmed'}', '${aptReason}')">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="cancelAppointment('${apt._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('renderAppointmentsTable Error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    Failed to load appointments: ${error.message}
                </td>
            </tr>
        `;
    }
};

// 6. Cancel / Delete Appointment
const cancelAppointment = async (id) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Cancel Appointment',
        message: 'Are you sure you want to cancel and delete this appointment?',
        subtext: 'This slot will be released back to the clinic calendar.',
        confirmText: 'Yes, Cancel Appointment',
        cancelText: 'Keep Visit',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-calendar-x-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/appointments/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.showToast('Appointment cancelled successfully.', 'success');
            renderAppointmentsTable();
        } else {
            window.showToast(data.message || 'Could not cancel appointment.', 'danger');
        }
    } catch (error) {
        window.showToast('Network error while cancelling appointment.', 'danger');
    }
};

// 7. Open Edit Modal & Handle Update
const openEditAppointmentModal = (id, date, time, status, reason) => {
    const modalEl = document.getElementById('editAppointmentModal');
    if (!modalEl) return;

    document.getElementById('editAptId').value = id;
    document.getElementById('editAptDate').value = date;
    document.getElementById('editAptTime').value = time;
    document.getElementById('editAptStatus').value = status;
    document.getElementById('editAptReason').value = reason;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editAptId').value;
    const appointmentDate = document.getElementById('editAptDate').value;
    const appointmentTime = document.getElementById('editAptTime').value;
    const status = document.getElementById('editAptStatus').value;
    const reason = document.getElementById('editAptReason').value;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ appointmentDate, appointmentTime, status, reason })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editAppointmentModal')).hide();
            window.showToast('Appointment updated successfully!', 'success');
            renderAppointmentsTable();
        } else {
            window.showToast(data.message || 'Failed to update appointment', 'danger');
        }
    } catch (error) {
        window.showToast('Error updating appointment.', 'danger');
    }
};

// Expose functions to window
window.AppointmentModule = {
    loadDoctors,
    renderDoctorsList,
    populateDoctorSelect,
    handleBookAppointment,
    renderAppointmentsTable,
    cancelAppointment,
    openEditAppointmentModal,
    handleUpdateAppointment
};
