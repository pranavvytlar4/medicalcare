/**
 * ============================================================================
 * CureMed Custom Select System
 * Transforms all standard HTML <select class="form-select"> elements into
 * ultra-modern, high-end Webflow-style interactive custom dropdown menus.
 * ============================================================================
 */

(function () {
    'use strict';

    // Helper to get matching icon or doctor avatar image for options
    function getOptionIcon(text, value, opt) {
        const lowerVal = String(value || '').toLowerCase();
        const lowerText = String(text || '').toLowerCase();

        // 1. Check if option has an explicit data-image attribute (Doctor photo, User avatar, etc.)
        const explicitImg = opt ? (opt.dataset?.image || opt.getAttribute?.('data-image')) : '';
        if (explicitImg && !isPlaceholderOption(opt)) {
            const cleanImg = explicitImg.startsWith('http://') || explicitImg.startsWith('https://') || explicitImg.startsWith('data:') || explicitImg.startsWith('/')
                ? explicitImg
                : '/' + explicitImg.replace(/^(\.\.\/|\.\/)/, '');
            return `<img src="${cleanImg}" alt="${text}" class="curemed-opt-doctor-avatar rounded-circle me-2 object-fit-cover flex-shrink-0" onerror="this.onerror=null; this.src='/images/male-doctor.jpg';">`;
        }

        // 2. Doctor entries: Check if this is a doctor (value starts with 'doc_' or text starts with 'Dr.' or includes 'Doctor')
        if (!isPlaceholderOption(opt) && (lowerVal.startsWith('doc_') || lowerText.startsWith('dr.') || lowerText.includes('dr. ') || lowerText.includes('doctor'))) {
            let doctorImg = '/images/male-doctor.jpg';
            if (lowerText.includes('priya') || lowerText.includes('sarah')) doctorImg = '/images/dr-sarah-johnson.jpg';
            else if (lowerText.includes('rajesh') || lowerText.includes('robert')) doctorImg = '/images/dr-robert-miller.jpg';
            else if (lowerText.includes('ananya') || lowerText.includes('emily')) doctorImg = '/images/dr-emily-watson.jpg';
            else if (lowerText.includes('devraj') || lowerText.includes('rodrigues') || lowerText.includes('tiago')) doctorImg = '/images/dr-rodrigues.jpg';
            else if (lowerText.includes('aisha')) doctorImg = '/images/dr-aisha-patel.jpg';
            else if (lowerText.includes('satya') || lowerText.includes('siva')) doctorImg = '/images/male-doctor.jpg';

            return `<img src="${doctorImg}" alt="${text}" class="curemed-opt-doctor-avatar rounded-circle me-2 object-fit-cover flex-shrink-0" onerror="this.onerror=null; this.src='/images/male-doctor.jpg';">`;
        }

        // Roles
        if (lowerVal === 'admin' || lowerText.includes('admin')) {
            return '<i class="bi bi-shield-shaded text-danger me-2"></i>';
        }
        if (lowerVal === 'doctor' || lowerText.includes('doctor')) {
            return '<i class="bi bi-person-badge-fill text-primary me-2"></i>';
        }
        if (lowerVal === 'patient' || lowerText.includes('patient') || lowerText.includes('user')) {
            return '<i class="bi bi-person-fill text-success me-2"></i>';
        }

        // Blood Groups
        if (/^(a|b|ab|o)[+-]$/i.test(value)) {
            return '<i class="bi bi-droplet-fill text-danger me-2"></i>';
        }

        // Specializations
        if (lowerText.includes('cardio')) return '<i class="bi bi-heart-pulse-fill text-danger me-2"></i>';
        if (lowerText.includes('neuro')) return '<i class="bi bi-diagram-3-fill text-info me-2"></i>';
        if (lowerText.includes('pediatric')) return '<i class="bi bi-person-hearts text-warning me-2"></i>';
        if (lowerText.includes('ortho')) return '<i class="bi bi-activity text-secondary me-2"></i>';
        if (lowerText.includes('derma')) return '<i class="bi bi-stars text-danger me-2"></i>';
        if (lowerText.includes('general')) return '<i class="bi bi-bandaid-fill text-primary me-2"></i>';

        // Times & Appointments
        if (lowerText.includes('am') || lowerText.includes('pm') || lowerText.includes('slot')) {
            return '<i class="bi bi-clock-fill text-primary me-2"></i>';
        }

        // Statuses
        if (lowerVal === 'confirmed' || lowerVal === 'completed' || lowerVal === 'active') {
            return '<i class="bi bi-check-circle-fill text-success me-2"></i>';
        }
        if (lowerVal === 'cancelled' || lowerVal === 'inactive') {
            return '<i class="bi bi-x-circle-fill text-danger me-2"></i>';
        }
        if (lowerVal === 'scheduled' || lowerVal === 'pending') {
            return '<i class="bi bi-hourglass-split text-warning me-2"></i>';
        }

        // Moods / Wellness
        if (lowerText.includes('happy') || lowerText.includes('peaceful')) return '<span class="me-2">😊</span>';
        if (lowerText.includes('calm') || lowerText.includes('relaxed')) return '<span class="me-2">😌</span>';
        if (lowerText.includes('energetic') || lowerText.includes('motivated')) return '<span class="me-2">⚡</span>';
        if (lowerText.includes('balanced')) return '<span class="me-2">⚖️</span>';
        if (lowerText.includes('tired') || lowerText.includes('fatigued')) return '<span class="me-2">🥱</span>';
        if (lowerText.includes('stressed') || lowerText.includes('overwhelmed')) return '<span class="me-2">😰</span>';
        if (lowerText.includes('anxious') || lowerText.includes('worried')) return '<span class="me-2">😟</span>';

        // Placeholder fallback
        if (isPlaceholderOption(opt)) {
            if (lowerText.includes('doctor') || lowerText.includes('specialist')) {
                return '<i class="bi bi-person-badge text-primary me-2"></i>';
            }
            return '<i class="bi bi-card-list text-primary me-2"></i>';
        }

        return '';
    }

    function isPlaceholderOption(opt) {
        if (!opt) return false;
        const val = String(opt.value || '').trim();
        const txt = String(opt.text || '').trim();
        return val === '' || txt.startsWith('--') || txt.toLowerCase().startsWith('select') || txt.toLowerCase().startsWith('choose') || txt.toLowerCase().startsWith('loading');
    }

    function initCustomSelect(select) {
        if (!select || select.dataset.curemedCustom === 'true') return;
        select.dataset.curemedCustom = 'true';

        // Hide native select accessibly so form validation & serialization continue to work
        select.classList.add('curemed-select-native');

        // Create custom outer wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'curemed-select-wrapper';
        if (select.closest('.input-group')) {
            wrapper.classList.add('in-input-group');
        }

        // Create trigger button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'curemed-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const label = document.createElement('div');
        label.className = 'curemed-select-label';

        const arrow = document.createElement('i');
        arrow.className = 'bi bi-chevron-down curemed-select-arrow';

        trigger.appendChild(label);
        trigger.appendChild(arrow);
        wrapper.appendChild(trigger);

        // Create floating dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'curemed-select-dropdown';
        dropdown.setAttribute('role', 'listbox');
        wrapper.appendChild(dropdown);

        // Insert wrapper right after the select
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Function to rebuild options from the native select
        function renderOptions() {
            dropdown.innerHTML = '';
            const options = Array.from(select.options);

            if (options.length === 0) {
                dropdown.innerHTML = '<div class="curemed-select-empty text-muted p-2 text-center small">No options available</div>';
                label.innerHTML = '<span class="text-muted small">None</span>';
                return;
            }

            const currentOpt = select.options[select.selectedIndex] || options[0];
            updateLabel(currentOpt);

            options.forEach((opt) => {
                const optItem = document.createElement('div');
                optItem.className = 'curemed-select-option';
                optItem.setAttribute('role', 'option');
                optItem.dataset.value = opt.value;

                if (opt.disabled) {
                    optItem.classList.add('disabled');
                }

                if (isPlaceholderOption(opt)) {
                    optItem.classList.add('placeholder-opt');
                }

                const isSelected = opt.selected || opt.value === select.value;
                if (isSelected) {
                    optItem.classList.add('selected');
                }

                const iconHtml = getOptionIcon(opt.text, opt.value, opt);
                optItem.innerHTML = `
                    <div class="d-flex align-items-center text-truncate">
                        ${iconHtml}
                        <span class="curemed-opt-text text-truncate">${opt.text}</span>
                    </div>
                    <i class="bi bi-check2 curemed-opt-check ${isSelected ? '' : 'd-none'}"></i>
                `;

                optItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (opt.disabled) return;

                    select.value = opt.value;
                    Array.from(select.options).forEach((o, i) => {
                        const match = o.value === opt.value;
                        o.selected = match;
                        if (match) {
                            select.selectedIndex = i;
                        }
                    });

                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));

                    updateSelectedUI();
                    closeDropdown();
                });

                dropdown.appendChild(optItem);
            });
        }

        // Helper to update the trigger label display
        function updateLabel(currentOpt) {
            if (!currentOpt) {
                label.innerHTML = '<span class="text-muted">Choose an option</span>';
                return;
            }

            const iconHtml = getOptionIcon(currentOpt.text, currentOpt.value, currentOpt);
            if (isPlaceholderOption(currentOpt)) {
                label.innerHTML = `${iconHtml}<span class="text-muted fst-italic">${currentOpt.text}</span>`;
            } else {
                label.innerHTML = `${iconHtml}<span class="fw-medium">${currentOpt.text}</span>`;
            }
        }

        // Function to update trigger label & active class
        function updateSelectedUI() {
            const currentOpt = select.options[select.selectedIndex];
            updateLabel(currentOpt);

            dropdown.querySelectorAll('.curemed-select-option').forEach((item) => {
                const isSelected = item.dataset.value === select.value;
                item.classList.toggle('selected', isSelected);
                const check = item.querySelector('.curemed-opt-check');
                if (check) check.classList.toggle('d-none', !isSelected);
            });
        }

        function openDropdown() {
            // Close any other open dropdowns first
            document.querySelectorAll('.curemed-select-wrapper.is-open').forEach((w) => {
                if (w !== wrapper) {
                    w.classList.remove('is-open');
                    const btn = w.querySelector('.curemed-select-trigger');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });

            // Check if dropdown should open upwards (dropup) if near bottom
            const rect = trigger.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 280 && rect.top > 280) {
                wrapper.classList.add('dropup');
            } else {
                wrapper.classList.remove('dropup');
            }

            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closeDropdown() {
            wrapper.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function toggleDropdown() {
            if (wrapper.classList.contains('is-open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
        }

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
        });

        // Listen for standard 'change' and 'input' events on native select
        select.addEventListener('change', () => {
            updateSelectedUI();
        });
        select.addEventListener('input', () => {
            updateSelectedUI();
        });

        // Listen for form reset to reset custom label
        if (select.form) {
            select.form.addEventListener('reset', () => {
                setTimeout(updateSelectedUI, 20);
            });
        }

        // Sync when parent Bootstrap modal is shown
        const modalAncestor = select.closest('.modal');
        if (modalAncestor) {
            modalAncestor.addEventListener('shown.bs.modal', () => {
                updateSelectedUI();
            });
        }

        // Observe dynamic changes to <option> tags inside select (e.g. async fetch)
        const observer = new MutationObserver(() => {
            renderOptions();
        });
        observer.observe(select, { childList: true, subtree: true, attributes: true });

        // Initial render
        renderOptions();
    }

    // Global click listener to close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.curemed-select-wrapper')) {
            document.querySelectorAll('.curemed-select-wrapper.is-open').forEach((w) => {
                w.classList.remove('is-open');
                const btn = w.querySelector('.curemed-select-trigger');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Keyboard support: Escape closes dropdown
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.curemed-select-wrapper.is-open').forEach((w) => {
                w.classList.remove('is-open');
                const btn = w.querySelector('.curemed-select-trigger');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
        }
    });

    // Initialize all selects in page
    function initAll() {
        document.querySelectorAll('select.form-select').forEach((s) => {
            initCustomSelect(s);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    // Expose API globally
    window.CureMedSelect = {
        init: initCustomSelect,
        initAll: initAll
    };
})();
