const $toast = $('#toast');

const showToast = (result) => {
    $toast.attr('class', '');
    $toast.addClass(result.type);
    $toast.text(result.text);
    $toast.animate({
            opacity: 1,
            marginRight: 0
        }, 500, 'linear', () =>
            setTimeout(() => hideToast(), 1000)
    );
}

const showSkipToast = () => {
    isShowSkipToast = true;
    $toastSkip.animate({
        opacity: 1,
        marginRight: 0
    }, 500, 'linear');
}

const hideToast = () => {
    $toast.animate({
        opacity: 0,
        marginRight: -250
    }, 1000, 'linear',)
}

const hideSkipToast = () => {
    isShowSkipToast = false;
    $toastSkip.animate({
        opacity: 0,
        marginRight: -250
    }, 1000, 'linear',)
}
