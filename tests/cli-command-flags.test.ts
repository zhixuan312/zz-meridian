// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { misapplied } from '../cli/src/command-flags.ts';

/**
 * A flag a command does not read must be refused, never accepted and ignored. `adopt --dry-run` used to copy Meridian
 * into the project, replace its stylesheet and write the manifest, while the person waited for a preview.
 */
describe('a flag outside its command', () => {
  it('refuses the update modes on the commands that do not act on them', () => {
    for (const flag of ['dry-run', 'resume', 'finalize', 'abort', 'verify', 'verbose']) {
      for (const command of ['adopt', 'create', 'brand', 'skill']) {
        expect(misapplied(command, { [flag]: true }), `${command} --${flag}`).toEqual({ flag, belongsTo: 'zz-meridian update' });
      }
    }
  });

  it('refuses the brand flags on the commands that write no brand', () => {
    expect(misapplied('update', { name: 'Acme' })).toEqual({ flag: 'name', belongsTo: 'zz-meridian adopt or create or brand' });
    expect(misapplied('skill', { hex: '#fff' })).toEqual({ flag: 'hex', belongsTo: 'zz-meridian adopt or create or brand' });
  });

  it('refuses --global anywhere but skill', () => {
    expect(misapplied('adopt', { global: true })).toEqual({ flag: 'global', belongsTo: 'zz-meridian skill' });
  });

  it('reads every flag the command does declare, and the two every command reads', () => {
    expect(misapplied('adopt', { name: 'Acme', 'allow-dirty': true, 'no-install': true, help: true })).toBeNull();
    expect(misapplied('create', { name: 'Acme', 'no-install': true })).toBeNull();
    expect(misapplied('update', { 'dry-run': true, 'allow-dirty': true, 'no-install': true, verify: true, verbose: true })).toBeNull();
    expect(misapplied('update', { finalize: true, verify: true })).toBeNull();
    expect(misapplied('brand', { accent: 'jade', 'allow-dirty': true })).toBeNull();
    expect(misapplied('skill', { global: true, version: true })).toBeNull();
  });

  it('says nothing about a flag that was not passed', () => {
    expect(misapplied('adopt', { 'dry-run': undefined, name: undefined })).toBeNull();
  });
});
