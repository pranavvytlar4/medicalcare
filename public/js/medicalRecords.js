/**
 * ============================================================================
 * Medical Records Module (ES6)
 * Satisfies Q5, Q6, Q7, Q9 (fetch, async/await, CRUD operations)
 * ============================================================================
 */

// 1. Handle Add Medical Record
const handleAddMedicalRecord = async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('recordAlert');
    alertBox.classList.add('d-none');

    const form = e.target;
    const doctor = form.doctor.value;
    const diagnosis = form.diagnosis.value;
    const medicalHistory = form.medicalHistory.value;
    const prescription = form.prescription.value;
    const date = form.date.value;

    const { isValid, errors } = window.Validator.validateMedicalRecord({
        diagnosis,
        medicalHistory,
        prescription,
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

        const { response, data } = await window.Auth.apiFetch('/api/records', {
            method: 'POST',
            body: JSON.stringify({ doctor, diagnosis, medicalHistory, prescription, date })
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-file-earmark-medical me-1"></i> Save Medical Record';

        if (!response.ok) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${data.message || 'Failed to save medical record'}`;
            alertBox.classList.remove('d-none');
            return;
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Medical record created successfully! Redirecting...`;
        alertBox.classList.remove('d-none');

        form.reset();
        setTimeout(() => {
            window.location.href = 'records.html';
        }, 1500);
    } catch (error) {
        console.error('Add Medical Record Error:', error);
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> An unexpected error occurred. Please try again.';
        alertBox.classList.remove('d-none');
    }
};

// 2. Render Medical Records Table
const renderMedicalRecordsList = async () => {
    const tableBody = document.getElementById('recordsTableBody');
    if (!tableBody) return;

    const tableResponsive = tableBody.closest('.table-responsive');

    if (tableResponsive) tableResponsive.classList.add('table-empty-view');
    tableBody.innerHTML = `
        <tr class="empty-state-row">
            <td colspan="7" class="text-center py-4 empty-state-cell">
                <div class="spinner-border text-success" role="status"></div>
                <div class="text-muted mt-2">Loading medical records...</div>
            </td>
        </tr>
    `;

    try {
        const { response, data } = await window.Auth.apiFetch('/api/records');
        if (!response.ok) throw new Error(data.message);

        const records = data.data || [];

        if (records.length === 0) {
            if (tableResponsive) tableResponsive.classList.add('table-empty-view');
            tableBody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="7" class="text-center py-5 text-muted empty-state-cell">
                        <i class="bi bi-journal-medical fs-1 d-block mb-2 text-success opacity-50"></i>
                        <span>No medical records found. <a href="add.html" class="fw-bold">Create your first medical record</a>.</span>
                    </td>
                </tr>
            `;
            return;
        }

        if (tableResponsive) tableResponsive.classList.remove('table-empty-view');
        tableBody.innerHTML = records.map((rec, index) => `
            <tr>
                <td class="fw-bold text-secondary">${index + 1}</td>
                <td>
                    <i class="bi bi-calendar-check me-1 text-primary"></i> ${rec.date}
                </td>
                <td>
                    <div class="fw-bold text-dark">${rec.doctor || 'Attending Physician'}</div>
                    <small class="text-muted">Patient: ${rec.patient ? rec.patient.name : 'Unknown'}</small>
                </td>
                <td>
                    <span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle fw-semibold px-2 py-1">
                        ${rec.diagnosis}
                    </span>
                </td>
                <td class="text-truncate" style="max-width: 180px;" title="${rec.medicalHistory}">
                    ${rec.medicalHistory}
                </td>
                <td class="text-truncate" style="max-width: 180px;" title="${rec.prescription}">
                    ${rec.prescription}
                </td>
                <td class="text-end">
                    <div class="btn-group btn-action-group">
                        <button class="btn btn-outline-info btn-sm" title="View Details" onclick="viewRecordModal('${rec._id}', '${rec.doctor || ''}', '${rec.diagnosis.replace(/'/g, "\\'")}', '${rec.medicalHistory.replace(/'/g, "\\'")}', '${rec.prescription.replace(/'/g, "\\'")}', '${rec.date}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary btn-sm" title="Edit" onclick="openEditRecordModal('${rec._id}', '${rec.doctor || ''}', '${rec.diagnosis.replace(/'/g, "\\'")}', '${rec.medicalHistory.replace(/'/g, "\\'")}', '${rec.prescription.replace(/'/g, "\\'")}', '${rec.date}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" title="Delete" onclick="deleteMedicalRecord('${rec._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('renderMedicalRecordsList Error:', error);
        if (tableResponsive) tableResponsive.classList.add('table-empty-view');
        tableBody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="7" class="text-center py-4 text-danger empty-state-cell">
                    Failed to load medical records: ${error.message}
                </td>
            </tr>
        `;
    }
};

// 3. View Details Modal
const viewRecordModal = (id, doctor, diagnosis, medicalHistory, prescription, date) => {
    const modalEl = document.getElementById('viewRecordModal');
    if (!modalEl) return;

    document.getElementById('viewModalDoctor').textContent = doctor;
    document.getElementById('viewModalDate').textContent = date;
    document.getElementById('viewModalDiagnosis').textContent = diagnosis;
    document.getElementById('viewModalHistory').textContent = medicalHistory;
    document.getElementById('viewModalPrescription').textContent = prescription;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

// 4. Delete Medical Record
const deleteMedicalRecord = async (id) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Delete Medical Record',
        message: 'Are you sure you want to delete this medical record?',
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
        const { response, data } = await window.Auth.apiFetch(`/api/records/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.showToast('Medical record deleted successfully.', 'success');
            renderMedicalRecordsList();
        } else {
            window.showToast(data.message || 'Could not delete medical record.', 'danger');
        }
    } catch (error) {
        window.showToast('Network error while deleting medical record.', 'danger');
    }
};

// 5. Open Edit Modal & Handle Update
const openEditRecordModal = (id, doctor, diagnosis, medicalHistory, prescription, date) => {
    const modalEl = document.getElementById('editRecordModal');
    if (!modalEl) return;

    document.getElementById('editRecId').value = id;
    document.getElementById('editRecDoctor').value = doctor;
    document.getElementById('editRecDiagnosis').value = diagnosis;
    document.getElementById('editRecHistory').value = medicalHistory;
    document.getElementById('editRecPrescription').value = prescription;
    document.getElementById('editRecDate').value = date;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

const handleUpdateMedicalRecord = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editRecId').value;
    const doctor = document.getElementById('editRecDoctor').value;
    const diagnosis = document.getElementById('editRecDiagnosis').value;
    const medicalHistory = document.getElementById('editRecHistory').value;
    const prescription = document.getElementById('editRecPrescription').value;
    const date = document.getElementById('editRecDate').value;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/records/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ doctor, diagnosis, medicalHistory, prescription, date })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editRecordModal')).hide();
            window.showToast('Medical record updated successfully!', 'success');
            renderMedicalRecordsList();
        } else {
            window.showToast(data.message || 'Failed to update medical record', 'danger');
        }
    } catch (error) {
        window.showToast('Error updating medical record.', 'danger');
    }
};

// Expose functions to window
window.MedicalRecordsModule = {
    handleAddMedicalRecord,
    renderMedicalRecordsList,
    viewRecordModal,
    deleteMedicalRecord,
    openEditRecordModal,
    handleUpdateMedicalRecord
};
