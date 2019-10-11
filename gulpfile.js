var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

gulp.task("build", () => {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(gulp.dest("dist"));
});

gulp.task("default", gulp.series("build"));

gulp.task(
  "watch",
  gulp.parallel("build", function() {
    gulp.watch("src/**/*.ts", gulp.series("build"));
  })
);
