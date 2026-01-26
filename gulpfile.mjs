import gulp from "gulp"
import less from "gulp-less"

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */
const LESS_SRC = "./styles/co.less"
const CSS_DEST = "./css"
const LESS_WATCH = ["./styles/**/*.less"]

/**
 * Compiles LESS files from the source directory to the destination CSS directory.
 * Handles errors during compilation and logs the file paths.
 */
function compileLESS() {
  console.log("Compiling LESS files from:", LESS_SRC, "to:", CSS_DEST)
  return gulp
    .src(LESS_SRC)
    .pipe(
      less().on("error", function (err) {
        console.error("LESS Error:", err.message)
        this.emit("end")
      }),
    )
    .pipe(gulp.dest(CSS_DEST))
}
const css = gulp.series(compileLESS)

/**
 * Watch for changes in LESS files and recompile on update.
 */
function watchUpdates() {
  gulp.watch(LESS_WATCH, css)
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

export { css }
export default gulp.series(gulp.parallel(css), watchUpdates)
