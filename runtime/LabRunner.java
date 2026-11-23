import mars.*;
import mars.mips.hardware.RegisterFile;
import mars.mips.instructions.syscalls.Syscall;
import java.lang.reflect.Field;
import java.util.*;

public class LabRunner {
  public static void main(String[] args) throws Exception {
    boolean running = false;
    try {
      Globals.initialize(false);
      Globals.getSettings().setBooleanSettingNonPersistent(Settings.DELAYED_BRANCHING_ENABLED, false);
      Globals.getSettings().setBooleanSettingNonPersistent(Settings.SELF_MODIFYING_CODE_ENABLED, false);
      Field loaderField = Globals.instructionSet.getClass().getDeclaredField("syscallLoader");
      loaderField.setAccessible(true);
      Object loader = loaderField.get(Globals.instructionSet);
      Field listField = loader.getClass().getDeclaredField("syscallList");
      listField.setAccessible(true);
      ArrayList<Syscall> syscalls = (ArrayList<Syscall>) listField.get(loader);
      Set<Integer> allowed = new HashSet<>(Arrays.asList(1,2,3,4,5,6,7,8,9,10,11,12,17,34,35,36));
      syscalls.removeIf(s -> !allowed.contains(s.getNumber()));
      MIPSprogram program = new MIPSprogram();
      Globals.program = program;
      ArrayList<String> files = new ArrayList<>();
      files.add(args[0]);
      ArrayList prepared = program.prepareFilesForAssembly(files, args[0], null);
      program.assemble(prepared, true, false);
      RegisterFile.initializeProgramCounter(false);
      running = true;
      boolean done = program.simulate(Integer.parseInt(args[1]));
      if (!done) { System.err.println("MIPS_LAB_STEP_LIMIT"); System.exit(12); }
      if (Globals.exitCode != 0) { System.err.println("程序以非零状态退出: " + Globals.exitCode); System.exit(11); }
    } catch (ProcessingException e) {
      System.err.println(e.errors() == null ? "模拟器执行异常" : e.errors().generateErrorAndWarningReport());
      System.exit(running ? 11 : 10);
    } catch (Throwable e) {
      System.err.println(e.toString());
      System.exit(13);
    }
    System.exit(0);
  }
}
