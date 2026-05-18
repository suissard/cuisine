export default (plugin: any) => {
  plugin.controllers.user.me = async (ctx: any) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in.");
    }

    // Fetch user with role populated using Strapi 5 document service
    const populatedUser: any = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: user.documentId || user.id,
      populate: ['role']
    });

    if (!populatedUser) {
      return ctx.notFound('User not found');
    }

    return {
      id: populatedUser.id,
      documentId: populatedUser.documentId,
      username: populatedUser.username,
      email: populatedUser.email,
      confirmed: populatedUser.confirmed,
      blocked: populatedUser.blocked,
      role: populatedUser.role ? {
        id: populatedUser.role.id,
        documentId: populatedUser.role.documentId,
        name: populatedUser.role.name,
        description: populatedUser.role.description,
        type: populatedUser.role.type
      } : null,
      preferences: populatedUser.preferences || { theme: 'system', dietaryRestrictions: [], newsletter: false }
    };
  };

  return plugin;
};
