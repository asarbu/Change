export default class GraphicEffects {
	/** @type {Array<HTMLObjectElement>} */
	#slices = undefined;

	/** @type {number} */
	#currentIndex = 0;

	/** @type {HTMLOListElement} */
	#currentSlice = undefined;

	/** @type {Function} */
	#onSliceChanged = undefined;

	constructor() {
		/* Slice slider */
		this.rootContainer = undefined;
		this.mouseDown = false;
		this.scrolling = undefined;
		this.startX = 0;
		this.startY = 0;

		this.startSliderEventListener = this.startSlider.bind(this);
		this.moveSliderEventListener = this.moveSlider.bind(this);
		this.endSliderEventListener = this.endSlider.bind(this);
		this.refreshEventListener = this.refresh.bind(this);

		/* Navigation panel */
		this.navOpen = false;
	}

	init(forContainer) {
		/* Slice slider */
		this.rootContainer = forContainer;
		// TDO use percentages instead of width
		this.containerWidth = this.rootContainer.clientWidth;
		// TODO remove below line to improve performance. It causes reflow
		this.sliderWrapper = this.rootContainer.querySelector('.section');
		this.lastIndex = this.sliderWrapper.children.length + 1;
		// TDO reuse in memory DOM elements in order to accelerate reflows (use few DOM nodes)
		// This also ensures we have proper scroll position. We enable slide for > 3 slices
		// appened cloneNodes to the parent element.
		// const $clonedFirstChild = this.sliderWrapper.firstElementChild.cloneNode(true);
		// const $clonedLastChild = this.sliderWrapper.lastElementChild.cloneNode(true);
		// this.sliderWrapper.insertBefore($clonedLastChild, this.sliderWrapper.firstElementChild);
		// this.sliderWrapper.appendChild($clonedFirstChild);
		/* this.sliderWrapper.style.transition = 'transform 0s linear';
		this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * 1}px)`; */

		this.#slices = this.rootContainer.querySelectorAll('.slice');
		this.#slices.forEach((el, i) => {
			el.setAttribute('data-slice-index', i);
		});

		this.#currentIndex = 0;

		// * when mousedown or touchstart
		this.sliderWrapper.addEventListener('mousedown', this.startSliderEventListener);
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });

		// * when mouseup or touchend
		// TODO This registers the event listener multiple times
		window.addEventListener('mouseup', this.endSliderEventListener);
		window.addEventListener('touchend', this.endSliderEventListener);
		window.addEventListener('resize', this.refreshEventListener, true);
	}

	slideTo(index) {
		this.#currentIndex = +index;
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transition = 'transform 0.2s linear';
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;
			if (this.#onSliceChanged) this.#onSliceChanged(index);
		});
	}

	jumpTo(index) {
		this.#currentIndex = +index;
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;
			if (this.#onSliceChanged) this.#onSliceChanged(index);
		});
	}

	selectedIndex() {
		return this.#currentIndex;
	}

	selectedSlice() {
		return this.#slices[this.#currentIndex];
	}

	onClickSetSlice(e) {
		const sliceIndex = e.target.getAttribute('data-slice-index');
		this.slideTo(sliceIndex);
	}

	onSliceChange(callback) {
		this.#onSliceChanged = callback;
	}

	startSlider(e) {
		this.mouseDown = true;

		// read from desktop or mobile devices
		this.startX = e.clientX ? e.clientX : e.touches[0].screenX;
		this.startY = e.clientY ? e.clientY : e.touches[0].screenY;

		this.sliderWrapper.removeEventListener('touchmove', this.startSliderEventListener);
		this.sliderWrapper.removeEventListener('mousemove', this.startSliderEventListener);
		this.sliderWrapper.style.transition = 'transform 0s linear';
		this.rootContainer.addEventListener(
			e.clientX ? 'mousemove' : 'touchmove',
			this.moveSliderEventListener,
			{ passive: true },
		);
		this.#currentSlice = this.#slices[this.#currentIndex];
	}

	moveSlider(e) {
		if (!this.mouseDown) return;

		const currentX = e.clientX || e.touches?.get(0).screenX;
		const currentY = e.clientY || e.touches?.get(0).screenY;

		if (!currentX && !currentY) return;

		requestAnimationFrame(() => {
			if (!this.scrolling) {
				// Mouse move
				if (e.clientX) this.scrolling = 'horizontal';
				else {
					// Touch move. Check scroll direction
					if (Math.abs(currentY - this.startY) > 10
						&& this.#currentSlice.scrollTop > 0) { // Vertical
						// Do not allow horizontal scrolling anymore. It will glitch
						this.scrolling = 'vertical';
						// Reset horizontal scroll to zero, by resetting the slide index
						this.slideTo(this.#currentIndex);
						return;
					} if (Math.abs(currentX - this.startX) > 10) { // Horizontal
						this.scrolling = 'horizontal';
					}
				}
			}

			// Allow horizontal scroll even if no scroll is present.
			// Vertical is automatically performed by the system.
			if (this.scrolling === undefined || this.scrolling === 'horizontal') {
				const xTranslation = currentX - this.startX - this.containerWidth * (this.#currentIndex);
				this.sliderWrapper.style.transform = `translateX(${xTranslation}px)`;
			}
		});
	}

	endSlider(e) {
		if (!this.mouseDown || !e) return;

		this.mouseDown = false;
		if (this.scrolling === 'horizontal') {
			let x = e.clientX;
			// x evaluates to 0 if you drag left to the end of the body)
			if (!x && e.changedTouches) {
				x = e.changedTouches[0].screenX;
			}

			const dist = x - this.startX || 0;

			// Dist value was chosen after many trials when horizontal scrolls
			// did not work because they were detected as vertical scrolls
			if (dist > 50 && this.#currentIndex > 0) this.#currentIndex -= 1;
			else if (dist < -50 && this.#currentIndex < this.lastIndex - 2) this.#currentIndex += 1;
			this.slideTo(this.#currentIndex);
		}
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });
		this.scrolling = undefined;
	}

	refresh() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.slideTo(this.#currentIndex);
	}
}
