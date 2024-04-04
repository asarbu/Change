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

		/* nav panel */
		this.$main = document.getElementById('main');
		this.$sidenav_left = document.getElementById('sidenav');
		this.$sidenav_right = this.$sidenav_left.cloneNode(true);
		this.$sidenav_left.classList.add('sidenav-left');
		this.$sidenav_right.classList.add('sidenav-right');
		this.$sidenav_left.parentNode.appendChild(this.$sidenav_right);

		document.querySelectorAll('.nav-trigger').forEach((el) => el.addEventListener('click', this.openNav.bind(this)));
	}

	slideTo(index) {
		if (!this.containerWidth) {
			this.containerWidth = this.rootContainer.clientWidth;
		}

		this.currentIndex = +index;
		this.currentIndex = Math.min(this.currentIndex, this.lastIndex);
		requestAnimationFrame(() => {
			this.sliderWrapper.style.transition = 'transform 0.2s linear';
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
		if (!this.containerWidth) {
			this.containerWidth = this.rootContainer.clientWidth;
		}

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
		/*if (!this.mouseDown || !e) return;

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
		this.scrolling = undefined;*/
	}

	refresh() {
		this.containerWidth = this.rootContainer.clientWidth;
		this.slideTo(this.currentIndex);
	}

	/* Nav panel */
	openNav(ev) {
		const { side } = ev.currentTarget.dataset;
		if (side === 'left') {
			if (this.navOpen === 'left') {
				this.closeNav();
				return;
			}

			this.$sidenav_right.classList.remove('sidenav-open');
			this.$sidenav_left.classList.add('sidenav-open');
			this.$main.classList.remove('main-shift-right');
			this.$main.classList.add('main-shift-left');

			this.navOpen = 'left';
		} else if (side === 'right') {
			if (this.navOpen === 'right') {
				this.closeNav();
				return;
			}

			this.$sidenav_left.classList.remove('sidenav-open');
			this.$sidenav_right.classList.add('sidenav-open');
			this.$main.classList.remove('main-shift-left');
			this.$main.classList.add('main-shift-right');

			this.navOpen = 'right';
		}

		this.$main.addEventListener('transitionend', function transitioned() {
			this.$main.removeEventListener('transitionend', transitioned);
			this.refresh();
		}.bind(this));
	}

	closeNav() {
		this.$sidenav_left.classList.remove('sidenav-open');
		this.$sidenav_right.classList.remove('sidenav-open');
		this.$main.classList.remove('main-shift-left');
		this.$main.classList.remove('main-shift-right');

		this.navOpen = undefined;
		this.$main.addEventListener('transitionend', function transitioned() {
			this.$main.removeEventListener('transitionend', transitioned);
			this.refresh();
		}.bind(this));
	}
}

/* function createRow(table, data, options) {
	var index = -1;
	if (options.index) {
		index = options.index;
	}
	const row = table.tBodies[0].insertRow(index);
	var dataCell;

	for (const dataCtn of Object.values(data)) {
		dataCell = row.insertCell(-1);
		dataCell.textContent = dataCtn;
		if (!options.readonly) {
			dataCell.setAttribute('editable', true);
		}
		if (options.useBold == true) {
			dataCell.style.fontWeight = 'bold';
		}
	}

	if (options.color) {
		dataCell.style.color = options.color;
	}

	if (options.deletable) {
		const buttonsCell = row.insertCell(-1);
		const btn = create('button');
		btn.classList.add('waves-effect', 'waves-light', 'red', 'btn-small');
		buttonsCell.appendChild(btn);
		const img = create('img');
		img.classList.add('white-fill');
		img.innerText = 'Delete';
		img.alt = 'Delete';
		img.src = icons.delete;
		btn.appendChild(img)

		buttonsCell.setAttribute('hideable', 'true');
		if (options.hidden) {
			buttonsCell.style.display = 'none';
		}
	}
	// console.log("Created row", row)
	return row;
}

var percentColors = [
	{ pct: 0.0, color: { r: 0x00, g: 0xdf, b: 0 } },
	{ pct: 0.5, color: { r: 0xdf, g: 0xdf, b: 0 } },
	{ pct: 1.0, color: { r: 0xdf, g: 0x00, b: 0 } }];

function getColorForPercentage(pct) {

	if (pct > 1) {
		pct = 1
	}

	for (var i = 1; i < percentColors.length - 1; i++) {
		if (pct < percentColors[i].pct) {
			break;
		}
	}
	var lower = percentColors[i - 1];
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
		r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
		g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
		b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
	// or output as hex if preferred
}; */
