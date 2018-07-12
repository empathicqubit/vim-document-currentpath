let s:curdir = expand('<sfile>:p:h')

function! GetCurrentDocumentPath()
    let byte = line2byte( line( "." ) ) + col( "." ) - 1
    if &filetype != 'xml' && &filetype != 'html' && &filetype != 'json'
        return
    endif

    call job_start([ "node", "./index.js", byte, &filetype ], { "exit_cb": "GetCurrentDocumentPathCallback", "cwd": s:curdir . '/..', "out_io": "buffer", "out_name": "currentpath" , "in_io": "buffer", "in_name": "%" })
endfunction

function GetCurrentDocumentPathCallback(trash, moretrash)
    let g:document_currentpath_path = getbufline('currentpath', '$')[0]
endfunction

let g:document_currentpath_path = ''
let s:not_called_yet = 1
function! s:TheCursorMoved()
    let s:not_called_yet = 1
endfunction

function! s:MaybeCallGetCurrentDocumentPath(trash)
    if s:not_called_yet
        call GetCurrentDocumentPath()
        let s:not_called_yet = 0
    endif
endfunction

call timer_start(1000, function('s:MaybeCallGetCurrentDocumentPath', []), { 'repeat': -1 })
autocmd CursorMoved * call s:TheCursorMoved()

