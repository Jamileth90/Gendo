let private_env = {};
let public_env = {};
let fix_stack_trace = (error) => error?.stack;
function set_private_env(environment) {
  private_env = environment;
}
function set_public_env(environment) {
  public_env = environment;
}

export { set_public_env as a, private_env as b, fix_stack_trace as f, public_env as p, set_private_env as s };
//# sourceMappingURL=shared-server-cF6ckHns.js.map
