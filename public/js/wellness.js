/**
 * ============================================================================
 * Mental Wellness Module (ES6)
 * Satisfies Q5, Q6, Q7, Q9 (fetch, async/await, CRUD operations)
 * ============================================================================
 */

// 1. Handle Add Wellness Record
const handleAddWellness = async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('wellnessAlert');
    alertBox.classList.add('d-none');

    const form = e.target;
    const mood = form.mood.value;
    const status = form.status.value;
    const notes = form.notes.value;
    const date = form.date.value;

    const { isValid, errors } = window.Validator.validateWellness({
        mood,
        status,
        notes,
        date
    });

    window.Validator.resetFormValidation(form);

    if (!isValid) {
        Object.entries(errors).forEach(([field, msg]) => {
            const input = form[field];
            if (input) window.Validator.setFieldError(input, msg);
        });
        return;
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

        const { response, data } = await window.Auth.apiFetch('/api/wellness', {
            method: 'POST',
            body: JSON.stringify({ mood, status, notes, date })
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-journal-plus me-1"></i> Log Wellness Entry';

        if (!response.ok) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${data.message || 'Failed to save wellness record'}`;
            alertBox.classList.remove('d-none');
            return;
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Wellness record logged successfully! Redirecting...`;
        alertBox.classList.remove('d-none');

        form.reset();
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
    } catch (error) {
        console.error('Add Wellness Error:', error);
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> An unexpected error occurred. Please try again.';
        alertBox.classList.remove('d-none');
    }
};

// 2. Render Mental Wellness Records
const renderWellnessList = async () => {
    const container = document.getElementById('wellnessContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <div class="text-muted mt-2">Loading wellness journal...</div>
        </div>
    `;

    try {
        const { response, data } = await window.Auth.apiFetch('/api/wellness');
        if (!response.ok) throw new Error(data.message);

        const records = data.data || [];

        if (records.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="alert alert-light border p-5">
                        <i class="bi bi-emoji-smile fs-1 d-block mb-3 text-primary opacity-50"></i>
                        <h5>No Wellness Records Found</h5>
                        <p class="text-muted">Take a moment to reflect on your day and log your mental wellness.</p>
                        <a href="add.html" class="btn btn-primary mt-2">
                            <i class="bi bi-plus-circle me-1"></i> Log First Wellness Entry
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = records.map(rec => `
            <div class="col-md-6 mb-4">
                <div class="card h-100 shadow-sm border-0 rounded-4">
                    <div class="card-header bg-white border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                        <span class="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 fs-6">
                            <i class="bi bi-heart-pulse-fill me-1"></i> ${rec.mood}
                        </span>
                        <small class="text-muted"><i class="bi bi-calendar-event me-1"></i> ${rec.date}</small>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <strong class="text-secondary small">STATUS:</strong>
                            <span class="fw-bold text-dark ms-1">${rec.status}</span>
                        </div>
                        <p class="card-text text-secondary mb-3 bg-light p-3 rounded-3" style="min-height: 80px;">
                            ${rec.notes}
                        </p>
                    </div>
                    <div class="card-footer bg-white border-0 pb-3 pt-0 d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="openEditWellnessModal('${rec._id}', '${rec.mood.replace(/'/g, "\\'")}', '${rec.status.replace(/'/g, "\\'")}', '${rec.notes.replace(/'/g, "\\'")}', '${rec.date}')">
                            <i class="bi bi-pencil me-1"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteWellnessRecord('${rec._id}')">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('renderWellnessList Error:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-4 text-danger">
                Failed to load wellness records: ${error.message}
            </div>
        `;
    }
};

// 3. Delete Wellness Record
const deleteWellnessRecord = async (id) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Wellness Log',
        message: 'Are you sure you want to remove this wellness log?',
        subtext: 'This mood entry will be removed from your mental wellness history.',
        confirmText: 'Yes, Remove Log',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-emoji-frown-fill',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/wellness/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.showToast('Wellness record deleted successfully.', 'success');
            renderWellnessList();
        } else {
            window.showToast(data.message || 'Could not delete wellness record.', 'danger');
        }
    } catch (error) {
        window.showToast('Network error while deleting wellness record.', 'danger');
    }
};

// 4. Open Edit Modal & Handle Update
const openEditWellnessModal = (id, mood, status, notes, date) => {
    const modalEl = document.getElementById('editWellnessModal');
    if (!modalEl) return;

    document.getElementById('editWellnessId').value = id;
    document.getElementById('editWellnessMood').value = mood;
    document.getElementById('editWellnessStatus').value = status;
    document.getElementById('editWellnessNotes').value = notes;
    document.getElementById('editWellnessDate').value = date;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

const handleUpdateWellness = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editWellnessId').value;
    const mood = document.getElementById('editWellnessMood').value;
    const status = document.getElementById('editWellnessStatus').value;
    const notes = document.getElementById('editWellnessNotes').value;
    const date = document.getElementById('editWellnessDate').value;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/wellness/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ mood, status, notes, date })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editWellnessModal')).hide();
            if (window.showToast) window.showToast('Wellness record updated successfully!', 'success');
            renderWellnessList();
        } else {
            if (window.showToast) window.showToast(data.message || 'Failed to update wellness record', 'danger');
        }
    } catch (error) {
        if (window.showToast) window.showToast('Error updating wellness record.', 'danger');
    }
};

// Expose functions to window
window.WellnessModule = {
    handleAddWellness,
    renderWellnessList,
    deleteWellnessRecord,
    openEditWellnessModal,
    handleUpdateWellness
};
