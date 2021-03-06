import BookView from "./BookView";
import * as HTMLUtilities from "./HTMLUtilities";
import Store from "./Store";

const template = (sections: string) => `
    <ul class="settings-menu" role="menu">
        ${sections}
    </ul>
`;

const sectionTemplate = (options: string) => `
    <li><ul class="settings-options">
        ${options}
    </ul></li>
`;

const optionTemplate = (liClassName: string, buttonClassName: string, label: string, role: string, svgIcon: string, buttonId: string) => `
    <li class='${liClassName}'><button id='${buttonId}' class='${buttonClassName}' role='${role}' tabindex=-1>${label}${svgIcon}</button></li>
`;

const offlineTemplate = `
    <li>
        <div class='offline-status'></div>
    </li>
`;

const decreaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="decrease-font-size" class="icon">
  <title id="decrease-font-size">Decrease Font Size</title>
    <path d="M30,0A30,30,0,1,0,60,30,30,30,0,0,0,30,0ZM47.41144,32h-35V28h35Z"/>
</svg>
`;

const increaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="increase-font-size" class="icon">
  <title id="increase-font-size">Increase Font Size</title>
    <path d="M30,0A30,30,0,1,0,60,30,30,30,0,0,0,30,0ZM47.41144,32h-15.5V47.49841h-4V32h-15.5V28h15.5V12.49841h4V28h15.5Z"/>
</svg>
`;

const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 32" preserveAspectRatio="xMidYMid meet" class="checkedIcon" aria-label="check-icon" role="img">
  <title>check icon</title>
  <path d="M18.05257,31.0625,2.00775,15.01814a1,1,0,0,1,0-1.41422l2.535-2.535a1,1,0,0,1,1.4142,0L18.05257,23.16406,40.57154.646a1,1,0,0,1,1.4142,0l2.535,2.535a1,1,0,0,1,0,1.41423Z" />
</svg>
`;

export interface BookSettingsConfig {
    /** Store to save the user's selections in. */
    store: Store,

    /** Array of BookViews. */
    bookViews: BookView[],

    /** Array of font sizes in pixels sorted from smallest to largest. */
    fontSizesInPixels: number[],

    /** Initial font size to use until the user makes a selection. */
    defaultFontSizeInPixels?: number;
}

export default class BookSettings {
    private readonly store: Store;
    private readonly bookViews: BookView[];
    private viewButtons: { [key: string]: HTMLButtonElement };
    private readonly fontSizes: string[];
    private fontSizeButtons: { [key: string]: HTMLButtonElement };
    private fontSizeLabel: HTMLLIElement;
    private offlineStatusElement: HTMLElement;

    private viewChangeCallback: () => void = () => {};
    private fontSizeChangeCallback: () => void = () => {};

    private selectedView: BookView;
    private selectedFontSize: string;

    private static readonly SELECTED_VIEW_KEY = "settings-selected-view";
    private static readonly SELECTED_FONT_SIZE_KEY = "settings-selected-font-size";

    public static async create(config: BookSettingsConfig) {
        const fontSizes = config.fontSizesInPixels.map(fontSize => fontSize + "px");
        const settings = new this(config.store, config.bookViews, fontSizes);
        await settings.initializeSelections(config.defaultFontSizeInPixels ? config.defaultFontSizeInPixels + "px" : undefined);
        return settings;
    }

    protected constructor(store: Store, bookViews: BookView[], fontSizes: string[]) {
        this.store = store;
        this.bookViews = bookViews;
        this.fontSizes = fontSizes;
    }

    private async initializeSelections(defaultFontSize?: string): Promise<void> {
        if (this.bookViews.length >= 1) {
            let selectedView = this.bookViews[0];
            const selectedViewName = await this.store.get(BookSettings.SELECTED_VIEW_KEY);
            if (selectedViewName) {
                for (const bookView of this.bookViews) {
                    if (bookView.name === selectedViewName) {
                        selectedView = bookView;
                        break;
                    }
                }
            }
            this.selectedView = selectedView;
        }

        if (this.fontSizes.length >= 1) {
            // First, check if the user has previously set a font size.
            let selectedFontSize = await this.store.get(BookSettings.SELECTED_FONT_SIZE_KEY);
            let selectedFontSizeIsAvailable = (selectedFontSize && this.fontSizes.indexOf(selectedFontSize) !== -1);
            // If not, or the user selected a size that's no longer an option, is there a default font size?
            if ((!selectedFontSize || !selectedFontSizeIsAvailable) && defaultFontSize) {
                selectedFontSize = defaultFontSize;
                selectedFontSizeIsAvailable = (selectedFontSize && this.fontSizes.indexOf(selectedFontSize) !== -1);
            }
            // If there's no selection and no default, pick a font size in the middle of the options.
            if (!selectedFontSize || !selectedFontSizeIsAvailable) {
                const averageFontSizeIndex = Math.floor(this.fontSizes.length / 2);
                selectedFontSize = this.fontSizes[averageFontSizeIndex];
            }
            this.selectedFontSize = selectedFontSize;
        }
    }

    public renderControls(element: HTMLElement): void {
        const sections = [];

        if (this.bookViews.length > 1) {
            const viewOptions = this.bookViews.map(bookView =>
                optionTemplate("reading-style", bookView.name, bookView.label, "menuitem", checkSvg, bookView.label)
            );
            sections.push(sectionTemplate(viewOptions.join("")));
        }

        if (this.fontSizes.length > 1) {
            const fontSizeLabel = "<li class='font-size-label'>A</li>";
            const fontSizeOptions = optionTemplate("font-setting", "decrease", decreaseSvg, "menuitem", "", "decrease-font") + fontSizeLabel + optionTemplate("font-setting", "increase", increaseSvg, "menuitem", "", "increase-font");
            sections.push(sectionTemplate(fontSizeOptions));
        }
        sections.push(offlineTemplate);

        element.innerHTML = template(sections.join(""));
        this.viewButtons = {};
        if (this.bookViews.length > 1) {
            for (const bookView of this.bookViews) {
                this.viewButtons[bookView.name] = HTMLUtilities.findRequiredElement(element, "button[class=" + bookView.name + "]") as HTMLButtonElement;
            }
            this.updateViewButtons();
        }
        this.fontSizeButtons = {};
        if (this.fontSizes.length > 1) {
            for (const fontSizeName of ["decrease", "increase"]) {
                this.fontSizeButtons[fontSizeName] = HTMLUtilities.findRequiredElement(element, "button[class=" + fontSizeName + "]") as HTMLButtonElement;
            }
            this.fontSizeLabel = HTMLUtilities.findRequiredElement(element, 'li[class="font-size-label"]') as HTMLLIElement;
            this.updateFontSizeButtons();
        }

        this.offlineStatusElement = HTMLUtilities.findRequiredElement(element, 'div[class="offline-status"]') as HTMLElement;

        this.setupEvents();

        // Clicking the settings view outside the ul hides it, but clicking inside the ul keeps it up.
        HTMLUtilities.findRequiredElement(element, "ul").addEventListener("click", (event: Event) => {
            event.stopPropagation();
        });
    }

    public onViewChange(callback: () => void) {
        this.viewChangeCallback = callback;
    }

    public onFontSizeChange(callback: () => void) {
        this.fontSizeChangeCallback = callback;
    }

    private setupEvents(): void {
        for (const view of this.bookViews) {
            const button = this.viewButtons[view.name];
            if (button) {
                button.addEventListener("click", (event: MouseEvent) => {
                    const position = this.selectedView.getCurrentPosition();
                    this.selectedView.stop();
                    view.start(position);
                    this.selectedView = view;
                    this.updateViewButtons();
                    this.storeSelectedView(view);
                    this.viewChangeCallback();
                    event.preventDefault();
                });
            }
        }

        if (this.fontSizes.length > 1) {
            this.fontSizeButtons["decrease"].addEventListener("click", (event: MouseEvent) => {
                const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);
                if (currentFontSizeIndex > 0) {
                    const newFontSize = this.fontSizes[currentFontSizeIndex - 1];
                    this.selectedFontSize = newFontSize;
                    this.fontSizeChangeCallback();
                    this.updateFontSizeButtons();
                    this.storeSelectedFontSize(newFontSize);
                }
                event.preventDefault();
            });

            this.fontSizeButtons["increase"].addEventListener("click", (event: MouseEvent) => {
                const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);
                if (currentFontSizeIndex < this.fontSizes.length - 1) {
                    const newFontSize = this.fontSizes[currentFontSizeIndex + 1];
                    this.selectedFontSize = newFontSize;
                    this.fontSizeChangeCallback();
                    this.updateFontSizeButtons();
                    this.storeSelectedFontSize(newFontSize);
                }
                event.preventDefault();
            });
        }
    }

    private updateViewButtons(): void {
        for (const view of this.bookViews) {
            if (view === this.selectedView) {
                this.viewButtons[view.name].className = view.name + " active";
                this.viewButtons[view.name].setAttribute("aria-label", view.label + " mode enabled");
            } else {
                this.viewButtons[view.name].className = view.name;
                this.viewButtons[view.name].setAttribute("aria-label", view.label + " mode disabled");
            }
        }
    }

    private updateFontSizeButtons(): void {
        const currentFontSizeIndex = this.fontSizes.indexOf(this.selectedFontSize);

        if (currentFontSizeIndex === 0) {
            this.fontSizeButtons["decrease"].className = "decrease disabled";
        } else {
            this.fontSizeButtons["decrease"].className = "decrease";
        }

        if (currentFontSizeIndex === this.fontSizes.length - 1) {
            this.fontSizeButtons["increase"].className = "increase disabled";
        } else {
            this.fontSizeButtons["increase"].className = "increase";
        }
    }

    public getSelectedView(): BookView {
        return this.selectedView;
    }

    public getSelectedFontSize(): string {
        return this.selectedFontSize;
    }

    public getOfflineStatusElement(): HTMLElement {
        return this.offlineStatusElement;
    }

    private async storeSelectedView(view: BookView): Promise<void> {
        return this.store.set(BookSettings.SELECTED_VIEW_KEY, view.name);
    }

    private async storeSelectedFontSize(fontSize: string): Promise<void> {
        return this.store.set(BookSettings.SELECTED_FONT_SIZE_KEY, fontSize);
    }
};
