/**
 * ============================================================================
 * Interactive Animated Day Picker & Frequency Selector (ES6)
 * Replicates the TwentyThreeFour component from src/components/ui/day-picker.jsx
 * ============================================================================
 */

(function () {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly"];

    class DayPickerComponent {
        constructor(config) {
            this.container = typeof config.container === 'string'
                ? document.getElementById(config.container)
                : config.container;

            this.hiddenFrequencyInput = config.hiddenFrequencyId
                ? document.getElementById(config.hiddenFrequencyId)
                : null;

            this.hiddenDayInput = config.hiddenDayId
                ? document.getElementById(config.hiddenDayId)
                : null;

            this.dateInput = config.dateInputId
                ? document.getElementById(config.dateInputId)
                : null;

            this.option = config.defaultOption || "Weekly";
            const initialDay = config.defaultDay || "Mon";
            this.dayIndex = DAYS.indexOf(initialDay) >= 0 ? DAYS.indexOf(initialDay) : 1;
            
            // Start expanded by default as requested in screenshot
            this.isOptionOpen = config.startOpen !== undefined ? config.startOpen : true;
            this.onChange = config.onChange || null;

            if (this.container) {
                this.init();
            }
        }

        init() {
            this.render();
            this.syncHiddenInputs();
        }

        syncHiddenInputs() {
            const dayName = DAYS[this.dayIndex];
            if (this.hiddenFrequencyInput) {
                this.hiddenFrequencyInput.value = this.option;
            }
            if (this.hiddenDayInput) {
                this.hiddenDayInput.value = this.option === "Weekly" ? dayName : "";
            }

            // If Weekly and dateInput exists, adjust date to match the chosen weekday
            if (this.dateInput && this.option === "Weekly") {
                this.alignDateInputToWeekday(this.dayIndex);
            }

            if (typeof this.onChange === 'function') {
                this.onChange({
                    option: this.option,
                    dayIndex: this.dayIndex,
                    dayName: dayName,
                    summary: this.getSummaryText()
                });
            }
        }

        alignDateInputToWeekday(targetWeekday) {
            const currentVal = this.dateInput.value;
            const baseDate = currentVal ? new Date(currentVal) : new Date();
            if (isNaN(baseDate.getTime())) return;

            const currentWeekday = baseDate.getDay();
            let diff = targetWeekday - currentWeekday;
            if (diff < 0) diff += 7; // Nearest upcoming day

            const targetDate = new Date(baseDate.getTime() + diff * 24 * 60 * 60 * 1000);
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            this.dateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        getSummaryText() {
            if (this.option === "Weekly") {
                return `${this.option}, ${DAYS[this.dayIndex]}`;
            }
            return this.option;
        }

        setOption(newOption) {
            this.option = newOption;
            this.syncHiddenInputs();
            this.render();
        }

        setDay(index) {
            this.dayIndex = index;
            this.syncHiddenInputs();
            this.render();
        }

        setValue(val) {
            if (val.option && OPTIONS.includes(val.option)) {
                this.option = val.option;
            }
            if (val.dayName && DAYS.includes(val.dayName)) {
                this.dayIndex = DAYS.indexOf(val.dayName);
            }
            this.syncHiddenInputs();
            this.render();
        }

        getValue() {
            return {
                option: this.option,
                dayIndex: this.dayIndex,
                dayName: DAYS[this.dayIndex],
                summary: this.getSummaryText()
            };
        }

        render() {
            if (!this.container) return;

            let html = `
                <div class="day-picker-card">
            `;

            if (!this.isOptionOpen) {
                // Collapsed state
                html += `
                    <div class="day-picker-collapsed-row">
                        <span class="day-picker-label">Frequency</span>
                        <button type="button" class="day-picker-summary-btn" id="${this.container.id}_btnExpand">
                            <span>${this.getSummaryText()}</span>
                            <i class="bi bi-chevron-expand"></i>
                        </button>
                    </div>
                `;
            } else {
                // Expanded options state (matching screenshot)
                html += `
                    <div class="day-picker-options-row">
                        <div class="day-picker-options-list">
                            ${OPTIONS.map(op => `
                                <div class="day-picker-option-item ${this.option === op ? 'active' : ''}" data-option="${op}">
                                    ${op}
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="day-picker-check-btn" id="${this.container.id}_btnConfirm" title="Confirm schedule">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    </div>
                `;

                // Weekday row if Weekly is active
                if (this.option === "Weekly") {
                    html += `
                        <div class="day-picker-weekdays-row">
                            ${DAYS.map((d, idx) => `
                                <div class="day-picker-weekday-item ${this.dayIndex === idx ? 'active' : ''}" data-day="${idx}">
                                    ${d}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }

            html += `</div>`;
            this.container.innerHTML = html;

            this.bindEvents();
        }

        bindEvents() {
            // Expand button when collapsed
            const expandBtn = document.getElementById(`${this.container.id}_btnExpand`);
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.isOptionOpen = true;
                    this.render();
                });
            }

            // Confirm checkmark button
            const confirmBtn = document.getElementById(`${this.container.id}_btnConfirm`);
            if (confirmBtn) {
                confirmBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.isOptionOpen = false;
                    this.render();
                });
            }

            // Option items (Daily, Weekly, Monthly, Yearly)
            const optionItems = this.container.querySelectorAll('.day-picker-option-item');
            optionItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const chosen = item.getAttribute('data-option');
                    this.setOption(chosen);
                });
            });

            // Weekday items (Sun..Sat)
            const dayItems = this.container.querySelectorAll('.day-picker-weekday-item');
            dayItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const dayIdx = parseInt(item.getAttribute('data-day'), 10);
                    this.setDay(dayIdx);
                });
            });
        }
    }

    // Expose globally both as constructor and factory function
    function DayPicker(containerOrConfig, maybeConfig) {
        let config = {};
        if (containerOrConfig instanceof HTMLElement || typeof containerOrConfig === 'string') {
            config = Object.assign({}, maybeConfig || {}, { container: containerOrConfig });
        } else {
            config = containerOrConfig || {};
        }
        return new DayPickerComponent(config);
    }
    DayPicker.create = (config) => new DayPickerComponent(config);
    window.DayPicker = DayPicker;
})();
