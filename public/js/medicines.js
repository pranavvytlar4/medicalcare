/**
 * ============================================================================
 * Medicine Reminder Module (ES6)
 * Satisfies Q5, Q6, Q7, Q9 (fetch, async/await, CRUD operations)
 * ============================================================================
 */

// 1. Handle Add Medicine Reminder
const handleAddMedicine = async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('medicineAlert');
    alertBox.classList.add('d-none');

    const form = e.target;
    const medicineName = form.medicineName.value;
    const dosage = form.dosage.value;
    const date = form.date.value;
    const time = form.time.value;

    const frequency = form.frequency ? form.frequency.value : (window.addMedDayPicker ? window.addMedDayPicker.getValue().option : 'Weekly');
    const reminderDay = form.reminderDay ? form.reminderDay.value : (window.addMedDayPicker ? window.addMedDayPicker.getValue().dayName : 'Mon');

    const { isValid, errors } = window.Validator.validateMedicine({
        medicineName,
        dosage,
        date,
        time
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

        const { response, data } = await window.Auth.apiFetch('/api/medicines', {
            method: 'POST',
            body: JSON.stringify({ medicineName, name: medicineName, dosage, date, time, frequency, reminderDay })
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-alarm-fill me-1"></i> Add Medicine Reminder';

        if (!response.ok) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${data.message || 'Failed to add medicine'}`;
            alertBox.classList.remove('d-none');
            return;
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Medicine reminder added successfully! Redirecting...`;
        alertBox.classList.remove('d-none');

        form.reset();
        setTimeout(() => {
            window.location.href = 'medicines.html';
        }, 1500);
    } catch (error) {
        console.error('Add Medicine Error:', error);
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> An unexpected error occurred. Please try again.';
        alertBox.classList.remove('d-none');
    }
};

// 2. Render Medicines List
const renderMedicinesList = async () => {
    const tableBody = document.getElementById('medicinesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-warning" role="status"></div>
                <div class="text-muted mt-2">Loading medicine schedule...</div>
            </td>
        </tr>
    `;

    try {
        const { response, data } = await window.Auth.apiFetch('/api/medicines');
        if (!response.ok) throw new Error(data.message);

        const medicines = data.data || [];

        if (medicines.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        <i class="bi bi-capsule fs-1 d-block mb-2 text-warning opacity-50"></i>
                        No medicine reminders logged yet. <a href="add.html" class="fw-bold">Add your first reminder</a>.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = medicines.map((med, index) => `
            <tr>
                <td class="fw-bold text-secondary">${index + 1}</td>
                <td>
                    <div class="fw-bold text-dark fs-6">${med.medicineName || med.name}</div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${med.dosage}</span>
                </td>
                <td>
                    <span class="badge ${med.frequency === 'Daily' ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle'} rounded-pill px-3 py-1 fw-semibold">
                        <i class="bi ${med.frequency === 'Daily' ? 'bi-repeat' : med.frequency === 'Weekly' ? 'bi-calendar-week' : 'bi-calendar-event'} me-1"></i>
                        ${med.frequency || 'Weekly'}${med.frequency === 'Weekly' && med.reminderDay ? ` (${med.reminderDay})` : ''}
                    </span>
                </td>
                <td>
                    <i class="bi bi-calendar3 me-1 text-primary"></i> ${med.date}
                </td>
                <td>
                    <span class="badge bg-warning-subtle text-warning-emphasis fs-6 fw-semibold px-2 py-1">
                        <i class="bi bi-clock-fill me-1"></i> ${med.time}
                    </span>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-action-group">
                        <button class="btn btn-outline-primary btn-sm" onclick="openEditMedicineModal('${med._id}', '${(med.medicineName || med.name || '').replace(/'/g, "\\'")}', '${(med.dosage || '').replace(/'/g, "\\'")}', '${med.date}', '${med.time}', '${med.frequency || 'Weekly'}', '${med.reminderDay || 'Mon'}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteMedicine('${med._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('renderMedicinesList Error:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    Failed to load medicines: ${error.message}
                </td>
            </tr>
        `;
    }
};

// 3. Delete Medicine
const deleteMedicine = async (id) => {
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
        const { response, data } = await window.Auth.apiFetch(`/api/medicines/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.showToast('Medicine reminder removed successfully.', 'success');
            renderMedicinesList();
        } else {
            window.showToast(data.message || 'Could not delete medicine reminder.', 'danger');
        }
    } catch (error) {
        window.showToast('Network error while deleting reminder.', 'danger');
    }
};

// 4. Open Edit Medicine Modal & Handle Update
const openEditMedicineModal = (id, medicineName, dosage, date, time, frequency = 'Weekly', reminderDay = 'Mon') => {
    const modalEl = document.getElementById('editMedicineModal');
    if (!modalEl) return;

    document.getElementById('editMedId').value = id;
    document.getElementById('editMedName').value = medicineName;
    document.getElementById('editMedDosage').value = dosage;
    document.getElementById('editMedDate').value = date;
    document.getElementById('editMedTime').value = time;

    if (window.editMedDayPicker) {
        window.editMedDayPicker.setValue({ option: frequency, dayName: reminderDay });
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editMedId').value;
    const medicineName = document.getElementById('editMedName').value;
    const dosage = document.getElementById('editMedDosage').value;
    const date = document.getElementById('editMedDate').value;
    const time = document.getElementById('editMedTime').value;
    const frequency = window.editMedDayPicker ? window.editMedDayPicker.getValue().option : (document.getElementById('editMedFrequency')?.value || 'Weekly');
    const reminderDay = window.editMedDayPicker ? window.editMedDayPicker.getValue().dayName : (document.getElementById('editMedDay')?.value || 'Mon');

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/medicines/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ medicineName, name: medicineName, dosage, date, time, frequency, reminderDay })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editMedicineModal')).hide();
            window.showToast('Medicine reminder updated successfully!', 'success');
            renderMedicinesList();
        } else {
            window.showToast(data.message || 'Failed to update medicine reminder', 'danger');
        }
    } catch (error) {
        window.showToast('Error updating medicine reminder.', 'danger');
    }
};

// Expose functions to window
window.MedicineModule = {
    handleAddMedicine,
    renderMedicinesList,
    deleteMedicine,
    openEditMedicineModal,
    handleUpdateMedicine
};
