export default class GraphicEffects {
	constructor() {
		/* Slice slider */
		this.rootContainer = undefined;
		this.mouseDown = false;
		this.scrolling = undefined;
		this.currentIndex = 1;
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
		// this.containerWidth = this.rootContainer.clientWidth;
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

		this.slices = this.rootContainer.querySelectorAll('.slice');
		this.slices.forEach((el, i) => {
			el.setAttribute('data-slice-index', i);
		});

		this.currentIndex = 0;

		// * when mousedown or touchstart
		this.sliderWrapper.addEventListener('mousedown', this.startSliderEventListener);
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });

		// * when mouseup or touchend
		// TODO This registers the event listener multiple times
		window.addEventListener('mouseup', this.endSliderEventListener);
		window.addEventListener('touchend', this.endSliderEventListener);
		window.addEventListener('resize', this.refreshEventListener, true);
		// this.setSlide(this.currentIndex);
	}

	slideTo(index) {
		this.currentIndex = +index;
		// TODO remove this if not necessary. I am not sure why was needed
		// this.currentIndex = Math.min(this.currentIndex, this.lastIndex);
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transition = 'transform 0.2s linear';
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;
		});
	}

	jumpTo(index) {
		if (!this.containerWidth) {
			this.containerWidth = this.rootContainer.clientWidth;
		}

		this.currentIndex = +index;
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transform = `translateX(${-this.containerWidth * index}px)`;
		});
	}

	selectedIndex() {
		return this.currentIndex;
	}

	onClickSetSlice(e) {
		const sliceIndex = e.target.getAttribute('data-slice-index');
		this.slideTo(sliceIndex);
	}

	startSlider(e) {
		this.mouseDown = true;

		// check desktop or mobile
		this.startX = e.clientX ? e.clientX : e.touches[0].screenX;
		this.startY = e.clientY ? e.clientY : e.touches[0].screenY;

		this.sliderWrapper.removeEventListener('touchmove', this.startSliderEventListener);
		this.sliderWrapper.style.transition = 'transform 0s linear';
		this.rootContainer.addEventListener(
			e.clientX ? 'mousemove' : 'touchmove',
			this.moveSliderEventListener,
			{ passive: true },
		);
	}

	moveSlider(e) {
		if (!this.mouseDown) return;

		const currentX = e.clientX || e.touches[0].screenX;
		const currentY = e.clientY || e.touches[0].screenY;

		requestAnimationFrame(() => {
			if (!this.scrolling) {
				// Check scroll direction
				if (Math.abs(currentY - this.startY) > 10) { // Vertical
					// Needed to avoid glitches in horizontal scrolling
					this.scrolling = 'vertical';
					// Reset horizontal scroll to zero, by resetting the slide index
					this.slideTo(this.currentIndex);
					return;
				} if (Math.abs(currentX - this.startX) > 10) { // Horizontal
					this.scrolling = 'horizontal';
				}
			}

			// Allow horizontal scroll even if no scroll is present.
			// Vertical is allowed by default.
			if (this.scrolling === undefined || this.scrolling === 'horizontal') {
				const xTranslation = currentX - this.startX - this.containerWidth * (this.currentIndex);
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

			if (dist > 50 && this.currentIndex > 0) this.currentIndex -= 1;
			else if (dist < -50 && this.currentIndex < this.lastIndex - 2) this.currentIndex += 1;
			this.slideTo(this.currentIndex);
		}
		this.sliderWrapper.addEventListener('touchmove', this.startSliderEventListener, { passive: true });
		this.scrolling = undefined;
	}

	refresh() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.slideTo(this.currentIndex);
	}
}
