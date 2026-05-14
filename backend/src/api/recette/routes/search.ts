export default {
  routes: [
    {
      method: 'POST',
      path: '/recettes/search',
      handler: 'search.search',
      config: {
        auth: false,
      },
    },
  ],
};
