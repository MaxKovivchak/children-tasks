let startTime
let isOneTasksPerPage = true
let isSuperMode
let minTemperature = -30
let maxTemperature = 30

const $taskSound = $('#taskSound')
const $start = $('#start')
const $toastSkip = $('#toast-skip')
const $configTypeBtn = $('#configTypeBtn')
const $configModeBtn = $('#configModeBtn')
const $applyBtn = $('#apply button')
const testWrap = $('[data-wrap="test-wrap"]')
const $startBtn = $('#start button')
const $report = $('#report')
const report = {
    time: undefined,
    results: []
}

let attempts = 0
let maxAttempts = 2
let prevChildrenLength = 0
let validateCount = 0
let slideCount
let isSkipTask
let isShowSkipToast = false
let allCorrect = false
let slideItemWidth
let slideItemHeight
let slidesFullWidth

let $prev
let $next
let $slideList
let $slideItem
let $slideControls

const errorTxt = 'Не верно! Попробуй еще раз!'
const successTxt = 'Правильно!'
const resultType = {
    success: 'success',
    error: 'error',
}

let windowLocation = window.location
const isReportLink = !!(windowLocation.hash && windowLocation.search)

window.onhashchange = activeSlideChanged;

$(function() {
    $startBtn.on('click', () => {
        $('.overflow-disabled').removeClass('overflow-disabled');
        $start.slideUp();
        $configTypeBtn.slideUp();
        $configModeBtn.slideUp();
        startTime = new Date();
        $taskSound[0].play();

        initSlideDOMItem()

       if (testWrap && testWrap.length) {
           $(testWrap).each(function (index) {

               const test = $(this).find('[data-test]');
               const testName = $(test).data().test;
               const scriptName = `init${testName.charAt(0).toUpperCase()+testName.slice(1)}`;
               const hideTest = testWrap.length > 1 && index > 0;
               const isLastTest = testWrap.length === index + 1;

               if (isLastTest) {
                   prevChildrenLength = $(this).prev().find('li').length
               }

               $(test)[scriptName]({
                   isOneTasksPerPage,
                   isSuperMode,
                   isLastTest,
                   min: minTemperature,
                   max: maxTemperature,
                   prevChildrenLength
               });

               if (hideTest && !isSuperMode) {
                   $(this).hide();
               }
           })

           if (isSuperMode){
               $applyBtn.remove();
           }
       }
    });

    $configTypeBtn.on('click',() => {
        isOneTasksPerPage = !isOneTasksPerPage;
        $('#configTypeBtn span').text(!isOneTasksPerPage ? 'Включить' : 'Выключить');
    })

    $configModeBtn.on('click',() => {
        let refresh = `${windowLocation.protocol}//${windowLocation.host}${windowLocation.pathname}${isSuperMode ? '' : '?isSuperMode'}`;
        window.history.pushState({ path: refresh }, '', refresh);
        isSuperMode = !!windowLocation.search.length;
        $('#configModeBtn span').text(!isSuperMode ? 'Включить' : 'Выключить');
        $('body').toggleClass('super-mode');
    })

    setInitialUrl();
})

function soundValidate(isCorrect) {
    const $wrongSound = $('#wrongSound');
    const $correctSound = $('#correctSound');

    return isCorrect
        ? $correctSound[0].play()
        : $wrongSound[0].play();
}

function setInitialUrl() {
    if (isReportLink) {
        isSuperMode = true;
        isOneTasksPerPage = true;
        setTimeout(() => $startBtn.trigger('click'), 100);
    } else {
        let refresh = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        window.history.pushState({ path: refresh }, '', refresh)
    }
}

function setResultTime(allow) {
    if (allow) {
        const endTime = new Date();
        const resultTime = endTime.getTime() - startTime.getTime();
        report.time = `${new Date(resultTime).getMinutes()} мин, ${new Date(resultTime).getSeconds()} сек`;
    }
}

function renderReport() {
    const template = `
        <h3>Результаты теста</h3>
        <p>Время выполнения: ${report.time}</p>
    `;

    const tasks = report.results.sort((a, b) => a.index - b.index).map(reportTaskTemplate).join('');
    $report.html((template + tasks));
    $report.animate(
        {
            opacity: 1,
            marginRight: 0
        },
        500,
        'linear'
    );

    const reportToSave = {
        results: report.results.map(result => ({
            success: result.success,
            index: result.index,
            attempts: result.attempts
        })),
        time: report.time
    }

    console.log('Report to save', reportToSave);
}

function reportTaskTemplate(task){
    return`
        <div>Задача №${task.index + 1}: ${task.success ? 'правильно' : 'не правильно'}, 
            ${task.success
                ? task.attempts
                    ? task.attempts < 2
                        ? task.attempts + ' ошибкa'
                        : task.attempts + ' ошибки'
                    : task.attempts + ' ошибок'
                : 'пропущено'
            }
        </div>
    `;
}

function shuffle(arr) {
    const originArr = arr.join('')
    let ctr = arr.length, temp, index;

    while (ctr > 0) {
        index = Math.floor(Math.random() * ctr);
        ctr--;
        temp = arr[ctr];
        arr[ctr] = arr[index];
        arr[index] = temp;
    }

    if (originArr === arr.join('')) {
        shuffle(arr);
    }

    return arr;
}

function checkToSkip(attempts) {
    if (attempts > maxAttempts) {
        if (!isShowSkipToast) {
            setTimeout(() => showSkipToast(), 1500);
        } else {
            setTimeout(() => {
                $toastSkip.addClass('shake ');
                setTimeout(() => $toastSkip.removeClass('shake'), 500);
            }, 100);
        }
    }

    return attempts > maxAttempts;
}

function handleTypeToast(allCorrect, localReport) {
    if (allCorrect) {
        const successIdx = localReport.findIndex(r => r.success);
        showToast(localReport[successIdx])
    } else {
        const inCorrectIdx = localReport.findIndex(r => !r.success);
        showToast(localReport[inCorrectIdx])
    }
}

function commonValidate(params) {
    const uniqueReport = [...params.localReport].reverse().slice(0, params.originCount);

    if (isSkipTask) {
        report.results.push(...uniqueReport.reverse());
    } else if(!isShowSkipToast) {
        soundValidate(params.allCorrect);

        if (params.allCorrect) {
            report.results.push(...uniqueReport.reverse());
            nextTest(params.option.isLastTest);
        }

        if (params.validateCount < 3) {
            handleTypeToast(params.allCorrect, params.localReport);
        }
    }
}

function nextTest(isLastTest = false) {
    setTimeout(() => {
        $('[data-wrap="test-wrap"]:visible')
            .each(function(){
                if (!isLastTest) {
                    resetOption();
                    $(this).hide();
                    $(this).next().show();
                }
            })
    }, 1500)
}

function applyAnswer(self) {
    if (self.is(':visible')) {
        validateCount ++;
        self.handleResult();

        if (!allCorrect) {
            isShowSkipToast = checkToSkip(validateCount);
        }
    }
}

function resetOption() {
    isSkipTask = false;
    validateCount = 0;
    allCorrect = false;
}

function activeSlideChanged() {
    if (windowLocation.hash.length) {
        let slideNumber = windowLocation.hash.split('-')[1] - 1;
        slideNumber = slideNumber > slideCount - 1
            ? slideCount - 1
            : slideNumber < 1
                ? 0
                : slideNumber

        $slideList.animate(
            {left: -(slideItemWidth * slideNumber)},
            {duration: 'slow'}
        );

        manageSlideItemView(slideNumber);
    }
}

function manageSlideItemView(numberSlide) {
    const $active = $slideList.find('.slide-item.active');
    $active.removeClass('active');
    $slideItem.eq(numberSlide).addClass('active')

    prevDisabled();
    nextDisabled();
}

function prevDisabled() {
    const activeIdx = $('.selectable-row.active').index();
    activeIdx
        ? $prev.removeClass('disabled')
        : $prev.addClass('disabled')
}

function nextDisabled() {
    const activeIdx = $('.selectable-row.active').index();
    activeIdx + 1 < slideCount
        ? $next.removeClass('disabled')
        : $next.addClass('disabled')
}

function navigateToSlide(numberSlide) {
    if (numberSlide > slideCount || numberSlide < 1) { return }

    windowLocation.hash = `#task-${numberSlide}`;
    $slideItem.eq(numberSlide - 1).addClass('active');
}

function initSlider(self, isSuperMode, needGetSlideSize = false) {
    if (needGetSlideSize) {
        getSlideSize()
    }

    $(self).css({width: slideItemWidth, height: slideItemHeight});
    $slideList.css({width: slidesFullWidth, display: 'flex'});

    if (isSuperMode) {
        $slideControls.show();
    }

    if (isReportLink) {
        const slideNumber = windowLocation.hash ? +windowLocation.hash.split('-')[1] : 1
        navigateToSlide(slideNumber);
        activeSlideChanged();
    } else {
        navigateToSlide(1);
    }

    prevDisabled();
}

function initSlideDOMItem() {
    $prev = $('#prev')
    $next = $('#next')
    $slideList = $('.slide-list');
    $slideControls = $('#slideControls');

    $('.slide-list > li').each(function () {
        $(this).addClass('slide-item')
    })

    $slideItem = $slideList.find('.slide-item');
    slideCount = $slideItem.length;
    getSlideSize()

    $next.on('click', () => navigateToSlide(+windowLocation.hash.split('-')[1] + 1))

    $prev.on('click', () => navigateToSlide(+windowLocation.hash.split('-')[1] - 1))
}

function getSlideSize() {
    slideItemWidth = $slideItem.width();
    slideItemHeight = $slideItem.height();
    slidesFullWidth = slideCount * slideItemWidth;
}

function shakeSkipToast() {
    setTimeout(() => {
        $toastSkip.addClass('shake ');
        setTimeout(() => $toastSkip.removeClass('shake'), 500);
    }, 100);
}

//selectable
(function ($) {
    $.fn.initSelectable = function (option) {

        console.log('init selectable', option);

        const selectable = this;
        const $label = $(selectable).find('label');

        let numberRowTask = 0;
        let index;
        let correctValue;
        let checkedControl;

        manageConfig();

        $label.click(e => {
            if (attempts > maxAttempts) {
                shakeSkipToast()
                return;
            }
            prepareDate(e.target.control.value)
        });

        $toastSkip.on('click', () => {
            hideSkipToast();
            isSkipTask = true;
            attempts = 0;
            prepareDate($(checkedControl).val());
        })

        function prepareDate(controlValue) {
            checkedControl = $(selectable).find(`input[value=${controlValue}]`);
            correctValue = $(checkedControl).data().correctValue;
            index = $(selectable)
                .find(`input[value=${controlValue}]`)
                .parents('.selectable-row')
                .index();

            const receivedValue = $(checkedControl).val();

            stepValidate({
                received: receivedValue,
                correct: correctValue
            }, index);
        }

        function stepValidate(data, index) {
            const result = data.received === data.correct
                ? {
                    text: successTxt,
                    type: resultType.success,
                    success: true,
                    index,
                    attempts
                }
                : {
                    text: errorTxt,
                    type: resultType.error,
                    success: false,
                    index,
                    attempts
                };

            if (!isSkipTask) {
                soundValidate(result.success);
            }

            handleResult(result)
        }

        function handleResult(result) {

            const label = $(checkedControl).siblings();
            if (result.success || isSkipTask) {
                if (option.isOneTasksPerPage) {
                    navigateToSlide(+windowLocation.hash.split('-')[1] + 1);
                }
                if (!isSkipTask) {
                    $(label).addClass('correct');
                }
                numberRowTask++;
                const controls = $(checkedControl).closest('.selectable-row').find('.row li')
                disabledControls(controls);
                setResultTime(numberRowTask === slideCount);
                attempts = 0;
                report.results.push(result);
            } else {
                setTimeout(() => {
                    $(label).addClass('shake ');
                    setTimeout(() => $(label).removeClass('shake'), 500);
                }, 100);
                attempts++;
            }

            if (numberRowTask === slideCount) {
                setTimeout(() => renderReport(), 1000)
            }

            if (attempts > maxAttempts) {
                showSkipToast();
                return;
            }

            if (!isSkipTask) {
                showToast(result);
            }

            isSkipTask = undefined;
        }

        function disabledControls(controls) {
            $(controls).each(function () {
                $(this).addClass('disabled');
            })
        }

        function setSuperMode() {
            $slideItem.each(function (index) {
                $(this).prepend(`<span class="indicator-number">${index + 1}</span>`)
                $(this).find('li input')
                    .each(function () {
                        if ($(this).val() === $(this).data().correctValue) {
                            $(this).siblings().addClass('correct');
                        }
                        $(this).siblings().addClass('not-allowed');
                    })
            })
        }

        function manageConfig() {
            if (option.isOneTasksPerPage) {
                initSlider(selectable, option.isSuperMode);
            }
            if (option.isSuperMode) {
                setSuperMode();
            }
        }

    };
})(jQuery);

//slider
(function ($) {
    $.fn.initSlider = function (option) {

        console.log('init slider', option, this);

        const $sliderList = this.find('li');
        const sliderListCount = $sliderList.length;
        let localReport = [];

        initSliders(option.isSuperMode);

        $applyBtn.on('click', () => applyAnswer(this));

        $toastSkip.on('click', () => {
            if (this.is(':visible')) {
                isSkipTask = true;
                this.handleResult();
                nextTest(option.isLastTest);
                hideSkipToast();
            }
        })

        this.handleResult = function () {

            if (!isShowSkipToast) {

                $sliderList.each(function (idx) {
                    const index = report.results.length + idx;
                    const $input = $(this).find('input');
                    const success = $input.val() && $input.val() !== ''
                        ? +$input.val() === $input.data().correctValue
                        : false;
                    const localAttempts = [...localReport].reverse().find(r => r.index === index)?.attempts ?? attempts;

                    if (success) {
                        $input.siblings('.value').removeClass(resultType.error);
                        $input.siblings('.value').addClass(resultType.success);
                        
                        localReport.push({
                            text: successTxt,
                            type: resultType.success,
                            success: true,
                            index,
                            attempts: localAttempts
                        })
                    } else {
                        $input.siblings('.value').removeClass(resultType.success);
                        $input.siblings('.value').addClass('shake error');
                        setTimeout(() => setTimeout(() => $input.siblings('.value').removeClass('shake'), 500), 100);
                        
                        localReport.push({
                            text: errorTxt,
                            type: resultType.error,
                            success: false,
                            index,
                            attempts: localAttempts + 1
                        })
                    }
                });
            }

            allCorrect = sliderListCount === $sliderList.find('.value.success').length;

            commonValidate({
                allCorrect,
                localReport,
                option,
                originCount: sliderListCount,
                validateCount
            });

            if (option.isLastTest) {
                setResultTime(true);
            }
        }

        function initSliders(isAdmin) {
            $sliderList.each(function (index) {
                $(this).append('<span class="value"></span>');
                $(this).append('<div></div>');

                const $input = $(this).find('input');
                const $item = $(this).find('div');
                const $value = $(this).find('.value');
                $item.slider({
                    animate: 'slow',
                    disabled: isAdmin,
                    min: option.min,
                    max: option.max,
                    value: isAdmin ? $input.data().correctValue : undefined,
                    slide: function (_, ui) {
                        $value.removeClass(resultType.error);
                        $value.removeClass(resultType.success);
                        $value.text(`${ui.value > 0 ? '+' + ui.value : ui.value}`);
                        $input.val(ui.value);
                    }
                });
                $value.text(isAdmin ? $input.data().correctValue : null);

                if (isAdmin) {
                    $(this).prepend(`<span class="indicator-number">${index + 1}</span>`)
                }

                if (isAdmin) {
                    $input.siblings('.value').addClass(resultType.success);
                }
            })
        }
    }
})(jQuery);

//sortable col
(function ($) {
    $.fn.initSortableCol = function (option) {

        console.log('init sortable col', option);

        let $sortableList;
        const $base = $('#base');
        const $baseList = $base.find('li');
        const baseListCount = $base.find('li').length;

        let values = [];
        const answers = [];
        let localReport = [];

        initSortableTpl();

        $applyBtn.on('click', () => applyAnswer(this));

        $toastSkip.on('click', () => {
            if ($(this).is(':visible')) {
                isSkipTask = true;
                attempts = 0;

                this.handleResult();
                nextTest(option.isLastTest);
                hideSkipToast();
            }
        })

        this.handleResult = function() {

            if (!isShowSkipToast) {

                $sortableList
                    .find('input')
                    .each(function (idx) {
                        const $input = $(this);
                        const success = $input.val() === answers[idx];
                        const index = report.results.length + idx;
                        const localAttempts = [...localReport].reverse().find(r => r.index === index)?.attempts ?? attempts;

                        if (success) {
                            $input.siblings('label').removeClass(resultType.error);
                            $input.siblings('label').addClass(resultType.success);
                            localReport.push({
                                text: successTxt,
                                type: resultType.success,
                                success: true,
                                index,
                                attempts: localAttempts
                            })
                        } else {
                            $input.siblings('label').removeClass(resultType.success);
                            $input.siblings('label').addClass('shake error');
                            setTimeout(() =>
                                    setTimeout(() =>
                                        $input.siblings('label').removeClass('shake'), 500)
                                , 100);
                            localReport.push({
                                text: errorTxt,
                                type: resultType.error,
                                success: false,
                                index,
                                attempts: localAttempts + 1
                            })
                        }
                    });
            }

            allCorrect = $baseList.length === $sortableList.find('label.success').length;

            commonValidate({
                allCorrect,
                localReport,
                option,
                originCount: baseListCount,
                validateCount
            });

            if (option.isLastTest && (allCorrect || isSkipTask)) {
                setResultTime(true);
                renderReport()

                $applyBtn.attr('disabled', 'disabled');
                destroy();
            }
        }

        function initSortableTpl() {
            const arrTpl = [];
            const sortableWrap = $('<div></div>');
            let ul = $('<ul class="row"></ul>');

            $base.find('input')
                .each(function () {
                    arrTpl.push(sortableItemTpl($(this).data().correctValue));
                })

            $(ul).html(
                option.isSuperMode
                    ? arrTpl.join('')
                    : shuffle(arrTpl).join('')
            );

            $(sortableWrap)
                .insertAfter($base)
                .html(ul);

            if (!option.isSuperMode){
                initSortable();
            } else {
                $base.next()
                    .find('label')
                    .each(function () {
                        $(this).addClass(resultType.success)
                    })
                $base.find('li')
                    .each(function (index) {
                        $(this).prepend(`<span class="indicator-number">${option.prevChildrenLength + index + 1}</span>`)
                    })
            }
        }

        function initSortable() {

            let $sortable = $base.next();
            $sortableList = $sortable.find('ul');

            $baseList
                .find('input')
                .each(function () {
                    answers.push($(this).data().correctValue)
                });

            $sortableList
                .find('input')
                .each(function () {
                    values.push($(this).val())
                });

            $sortableList.sortable({
                withReplace: $base.data().replace,
                update: () => {
                    values = [];
                    $sortableList
                        .find('input')
                        .each((_, child) => {
                            values.push($(child).val())
                        })
                }
            });
        }

        function sortableItemTpl(value) {
            return `
                <li>
                    <input type="hidden" value="${value}">
                    <label>${value}</label>
                </li>
            `
        }

        function destroy() {
            $('.sortable').each(function() { $(this).sortable('destroy'); });
            $('.draggable').each(function() { $(this).draggable('destroy'); });
        }
    }
})(jQuery);

//sortable row
(function ($) {
    $.fn.initSortableRow = function (option) {

        console.log('init sortable row', option, this);

        let sortable = this;
        let $sortableList;
        let skippedIndex
        const $base = $('#base');
        const $baseList = $base.find('li');

        let values = [];
        const answers = [];

        manageConfig();

        $applyBtn.on('click', () => {
            if (attempts > maxAttempts) {
                shakeSkipToast()
                return
            }
            handleResult()
        });

        $toastSkip.on('click', () => {
            if ($(this).is(':visible')) {
                hideSkipToast()
                skip()
            }
        })

        function handleResult() {
            const $active = $slideList.find('.slide-item.active').find('[data-index]');
            const index = $active.data().index;
            const success = values[index] === answers[index];

            if (success) {
                $active.removeClass(resultType.error);
                $active.addClass(resultType.success);

                report.results.push({
                    text: successTxt,
                    type: resultType.success,
                    success: true,
                    index,
                    attempts
                });

                if (option.isOneTasksPerPage) {
                    navigateToSlide(+windowLocation.hash.split('-')[1] + 1);
                }

                attempts = 0;

                finish(index)

            } else {
                $active.removeClass(resultType.success);
                $active.addClass('shake error');
                setTimeout(() =>
                    setTimeout(() => $active.removeClass('shake'), 500), 100);
                attempts++;
            }

            soundValidate(success);

            if (attempts > maxAttempts) {
                showSkipToast();
                skippedIndex = index
                return;
            }

            if (!isSkipTask) {
                showToast({
                    text: success ? successTxt : errorTxt,
                    type: success ? resultType.success : resultType.error
                });
            }

            isSkipTask = undefined;
        }

        function skip() {
            isSkipTask = true;
            attempts = 0;

            report.results.push({
                text: errorTxt,
                type: resultType.error,
                success: false,
                index: skippedIndex,
                attempts
            });

            finish(skippedIndex)

            navigateToSlide(+windowLocation.hash.split('-')[1] + 1);
        }

        function finish(index){
            setResultTime(index + 1 === slideCount);

            if (index + 1 === slideCount) {
                setTimeout(() => {
                    renderReport()
                    $applyBtn.attr('disabled', 'disabled');
                    destroy();
                }, 1000)
            }
        }

        function manageConfig() {

            $base.find('input')
                .each(function () {
                    const ul = $('<ul class="row row-sortable"></ul>');
                    const label = $(this).next()

                    if (!$(label).find('span').length) {
                        $(label).append('<span></span>')
                    }

                    $(ul).append(sortableItemTpl($(this).data().correctValue));
                    $(ul).insertAfter(label)
                })

            if (!option.isSuperMode){
                initSortable();
            } else {
                $base.next()
                    .find('ul')
                    .each(function () {
                        $(this).addClass(resultType.success)
                    })
                $base.find('.slide-item')
                    .each(function (index) {
                        $(this).prepend(`<span class="indicator-number">${index + 1}</span>`)
                    })
            }

            initSlider(sortable, option.isSuperMode, true)
        }

        function initSortable() {

            let value = '';
            $sortableList = $base.find('.row-sortable');

            $baseList
                .find('[data-correct-value]')
                .each(function () {
                    answers.push($(this).data().correctValue)
                });

            $sortableList
                .each(function(index) {
                    $(this).attr('data-index', index);
                    value = ''

                    $(this)
                        .find('input')
                        .each(function () {
                            value += $(this).val()
                        })
                    values.push(value);
                })

            $sortableList.sortable({
                withReplace: $base.data().replace,
                update: (_, list) => {
                    const targetIndex = list.$sortable.data().index;
                    let newValues = [];
                    $(list.$sortable)
                        .find('input')
                        .each(function () {
                            newValues.push($(this).val())
                        });
                    values.splice(targetIndex, 1, newValues.join(''))
                }
            });
        }

        function sortableItemTpl(value) {
            let itemsWrap = ''
            const items = option.isSuperMode
                ? value.split('')
                : shuffle(value.split(''))

            items.forEach(function (item) {
                itemsWrap += `
                    <li>
                        <input type="hidden" value="${item}">
                        <label>${item}</label>
                    </li>
                `
            })
            return itemsWrap
        }

        function destroy() {
            $('.sortable').each(function() { $(this).sortable('destroy'); });
            $('.draggable').each(function() { $(this).draggable('destroy'); });
        }
    }
})(jQuery)

