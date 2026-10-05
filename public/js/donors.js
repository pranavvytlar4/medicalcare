/**
 * ============================================================================
 * Blood Donor Module (ES6)
 * Satisfies Q5, Q6, Q7, Q9 (fetch, async/await, CRUD operations)
 * ============================================================================
 */

// 1. Handle Donor Registration
const handleRegisterDonor = async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('donorAlert');
    alertBox.classList.add('d-none');

    const form = e.target;
    const name = form.name.value;
    const age = form.age.value;
    const bloodGroup = form.bloodGroup.value;
    const phone = form.phone.value;
    const location = form.location.value;

    const { isValid, errors } = window.Validator.validateDonor({
        name,
        age,
        bloodGroup,
        phone,
        location
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
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Registering...';

        const { response, data } = await window.Auth.apiFetch('/api/donors', {
            method: 'POST',
            body: JSON.stringify({ name, age, bloodGroup, phone, location })
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-heart-fill me-1"></i> Register as Blood Donor';

        if (!response.ok) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${data.message || 'Failed to register donor'}`;
            alertBox.classList.remove('d-none');
            return;
        }

        alertBox.className = 'alert alert-success';
        alertBox.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Thank you! You have been successfully registered as a Blood Donor.`;
        alertBox.classList.remove('d-none');

        form.reset();
        setTimeout(() => {
            window.location.href = 'donors.html';
        }, 1500);
    } catch (error) {
        console.error('Donor Registration Error:', error);
        alertBox.className = 'alert alert-danger';
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> An unexpected error occurred. Please try again.';
        alertBox.classList.remove('d-none');
    }
};

// 2. Fetch & Render Donors List
const renderDonorsList = async () => {
    const tableBody = document.getElementById('donorsTableBody');
    if (!tableBody) return;

    const searchInput = document.getElementById('donorSearch');
    const groupSelect = document.getElementById('bloodGroupFilter');

    const search = searchInput ? searchInput.value.trim() : '';
    const bloodGroup = groupSelect ? groupSelect.value : '';

    const tableResponsive = tableBody.closest('.table-responsive');

    if (tableResponsive) tableResponsive.classList.add('table-empty-view');
    tableBody.innerHTML = `
        <tr class="empty-state-row">
            <td colspan="6" class="text-center py-4 empty-state-cell">
                <div class="spinner-border text-danger" role="status"></div>
                <div class="text-muted mt-2">Loading blood donors...</div>
            </td>
        </tr>
    `;

    try {
        let url = '/api/donors';
        const params = new URLSearchParams();
        if (bloodGroup) params.append('bloodGroup', bloodGroup);
        if (search) params.append('search', search);
        if (params.toString()) url += `?${params.toString()}`;

        const { response, data } = await window.Auth.apiFetch(url);
        if (!response.ok) throw new Error(data.message);

        const donors = data.data || [];

        if (donors.length === 0) {
            if (tableResponsive) tableResponsive.classList.add('table-empty-view');
            tableBody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="6" class="text-center py-5 text-muted empty-state-cell">
                        <i class="bi bi-droplet-half fs-1 d-block mb-2 text-danger opacity-50"></i>
                        <span>No donors found for the specified criteria.</span>
                    </td>
                </tr>
            `;
            return;
        }

        if (tableResponsive) tableResponsive.classList.remove('table-empty-view');
        tableBody.innerHTML = donors.map((donor, index) => `
            <tr>
                <td class="fw-bold text-secondary">${index + 1}</td>
                <td>
                    <div class="fw-bold text-dark">${donor.name}</div>
                    <small class="text-muted">Age: ${donor.age ? donor.age + ' yrs' : 'N/A'}</small>
                </td>
                <td>
                    <span class="badge-blood">${donor.bloodGroup}</span>
                </td>
                <td>
                    <a href="tel:${donor.phone}" class="text-decoration-none text-primary fw-semibold">
                        <i class="bi bi-telephone-fill me-1 small"></i> ${donor.phone}
                    </a>
                </td>
                <td>
                    <i class="bi bi-geo-alt-fill me-1 text-danger"></i> ${donor.location}
                </td>
                <td class="text-end">
                    <div class="btn-group btn-action-group">
                        <button class="btn btn-outline-primary btn-sm" onclick="openEditDonorModal('${donor._id}', '${(donor.name || '').replace(/'/g, "\\'")}', ${donor.age || 'null'}, '${donor.bloodGroup}', '${donor.phone}', '${(donor.location || '').replace(/'/g, "\\'")}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteDonor('${donor._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('renderDonorsList Error:', error);
        if (tableResponsive) tableResponsive.classList.add('table-empty-view');
        tableBody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="6" class="text-center py-4 text-danger empty-state-cell">
                    Failed to load donors: ${error.message}
                </td>
            </tr>
        `;
    }
};

// 3. Delete Donor
const deleteDonor = async (id) => {
    const confirmed = await window.showConfirmDialog({
        title: 'Remove Blood Donor',
        message: 'Are you sure you want to remove this donor record?',
        subtext: 'This registration will be removed from the blood network.',
        confirmText: 'Yes, Remove Donor',
        cancelText: 'Cancel',
        confirmBtnClass: 'btn-danger',
        icon: 'bi-droplet-slash',
        iconColor: 'text-danger',
        iconBg: 'bg-danger-subtle'
    });
    if (!confirmed) return;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/donors/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            window.showToast('Donor record deleted successfully.', 'success');
            renderDonorsList();
        } else {
            window.showToast(data.message || 'Could not delete donor record.', 'danger');
        }
    } catch (error) {
        window.showToast('Network error while deleting donor.', 'danger');
    }
};

// 4. Open Edit Donor Modal & Handle Update
const openEditDonorModal = (id, name, age, bloodGroup, phone, location) => {
    const modalEl = document.getElementById('editDonorModal');
    if (!modalEl) return;

    document.getElementById('editDonorId').value = id;
    document.getElementById('editDonorName').value = name;
    document.getElementById('editDonorAge').value = age;
    document.getElementById('editDonorBloodGroup').value = bloodGroup;
    document.getElementById('editDonorPhone').value = phone;
    document.getElementById('editDonorLocation').value = location;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

const handleUpdateDonor = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editDonorId').value;
    const name = document.getElementById('editDonorName').value;
    const age = document.getElementById('editDonorAge').value;
    const bloodGroup = document.getElementById('editDonorBloodGroup').value;
    const phone = document.getElementById('editDonorPhone').value;
    const location = document.getElementById('editDonorLocation').value;

    try {
        const { response, data } = await window.Auth.apiFetch(`/api/donors/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, age, bloodGroup, phone, location })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('editDonorModal')).hide();
            window.showToast('Donor record updated successfully!', 'success');
            renderDonorsList();
        } else {
            window.showToast(data.message || 'Failed to update donor', 'danger');
        }
    } catch (error) {
        window.showToast('Error updating donor record.', 'danger');
    }
};

// Expose functions to window
window.DonorModule = {
    handleRegisterDonor,
    renderDonorsList,
    deleteDonor,
    openEditDonorModal,
    handleUpdateDonor
};
