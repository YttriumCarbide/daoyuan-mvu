import { createApp } from "vue";
import BeautyForum from "./beauty-forum.vue";

function mountBeautyForum() {
  const target = document.getElementById("beauty-rank-vue-root");
  if (!target || target.dataset.beautyForumMounted === "1") return;
  target.dataset.beautyForumMounted = "1";
  const app = createApp(BeautyForum);
  app.mount(target);
  window.__beauty_forum_app__ = app;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountBeautyForum, {
    once: true,
  });
} else {
  mountBeautyForum();
}

window.mountBeautyForum = mountBeautyForum;
