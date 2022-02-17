import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ManualVolOracle_BYTECODE } from "../../constants/constants";
import ManualVolOracle_ABI from "../../constants/abis/ManualVolOracle.json";
import { ethers } from "hardhat";

const main = async ({
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  console.log("00 - Deploying ManualVolOracle on", network.name);

  const { deployer, keeper } = await getNamedAccounts();

  //Deploy manual vol oracle

  const ManualVolOracle = await deploy("ManualVolOracle", {
    from: deployer,
    contract: {
      abi: ManualVolOracle_ABI,
      bytecode: ManualVolOracle_BYTECODE,
    },
    args: [keeper],
  });

  console.log(`ManualVolOracle @ ${ManualVolOracle.address}`);

  //deploy WETH contract
  const weth = await deploy("WETH9", {
    from: deployer,
    contract: "WETH9",
  });

  const wethDeployment = (await ethers.getContractFactory("WETH9")).attach(weth.address);

  console.log(`WETH deployed at: ${weth.address}`);

  // === WETH ===

  //Deposit some WETH to deployer
  await wethDeployment.deposit({ value: ethers.utils.parseEther("332") });
  console.log(`${await wethDeployment.symbol()} Balance of ${deployer}: ${await wethDeployment.balanceOf(deployer)} ${await wethDeployment.symbol()}`);

  //deploy USDC Main Contract
  const usdcMain = await deploy("FiatTokenV1", {
    from: deployer,
    contract: "FiatTokenV1",
  });

  const usdcMainDeployment = (await ethers.getContractFactory("FiatTokenV1")).attach(usdcMain.address);
  console.log(`USDC deployed at: ${usdcMain.address}`);

  // === USDC ===

  // initialize USDC
  await usdcMainDeployment.initialize(
    "USD Coin",
    "USDC",
    "USD",
    18,
    deployer,
    deployer,
    deployer,
    deployer
  );

  //configure minter and allowance to mint
  await usdcMainDeployment.configureMinter(deployer, ethers.utils.parseEther("332"));

  //mint some USDC to the deployer address
  await usdcMainDeployment.mint(deployer, ethers.utils.parseEther("332"));

  console.log(`${await usdcMainDeployment.symbol()} Balance of ${deployer}: ${await usdcMainDeployment.balanceOf(deployer)} ${await usdcMainDeployment.symbol()}`);

  // === Gamma Protocol ===

  //AddressBook deploy
  const addressBook = await deploy("AddressBook", {
    from: deployer,
    contract: "AddressBook"
  });
  const addressBookDeployment = (await ethers.getContractFactory("AddressBook")).attach(addressBook.address);

  console.log(`AddressBook deployed at: ${addressBook.address}`);

  //OTokenFactory deploy
  const OtokenFactory = await deploy("OtokenFactory", {
    from: deployer,
    contract: "OtokenFactory",
    args: [
      addressBook.address
    ]
  });

  //OTokenFactory set address in AddressBook
  addressBookDeployment.setOtokenFactory(OtokenFactory.address);

  console.log(`OtokenFactory deployed at: ${OtokenFactory.address}`);

  //Otoken implementation deploy
  const Otoken = await deploy("Otoken", {
    from: deployer,
    contract: "Otoken"
  });

  //Otoken implementation set address in AddressBook

  await addressBookDeployment.setOtokenImpl(Otoken.address);

  console.log(`Otoken implementation deployed at: ${Otoken.address}`);

  // Deploy Whitelist module
  const whitelist = await deploy("Whitelist", {
    from: deployer,
    contract: "Whitelist",
    args: [
      addressBook.address
    ]
  });

  console.log(`Whitelist deployed at: ${whitelist.address}`);

  //Whitelist module set address in AddressBook
  await addressBookDeployment.setWhitelist(whitelist.address);

  //Deploy Oracle module
  const oracle = await deploy("Oracle", {
    from: deployer,
    contract: "Oracle"
  });

  console.log(`Oracle deployed at: ${oracle.address}`);

  //Oracle module set address in AddressBook
  await addressBookDeployment.setOracle(oracle.address);

  //Deploy MarginPool module
  const MarginPool = await deploy("MarginPool", {
    from: deployer,
    contract: "MarginPool",
    args: [
      addressBook.address
    ]
  });

  console.log(`MarginPool deployed at: ${MarginPool.address}`);

  //MarginPool module set address in AddressBook
  await addressBookDeployment.setMarginPool(MarginPool.address);

  //Deploy MarginCalculator module
  const MarginCalculator = await deploy("MarginCalculator", {
    from: deployer,
    contract: "MarginCalculator",
    args: [
      addressBook.address
    ]
  });

  console.log(`MarginCalculator deployed at: ${MarginCalculator.address}`);

  //MarginCalculator set address in AddressBook
  await addressBookDeployment.setMarginCalculator(MarginCalculator.address);

  //Deploy MarginVault library
  const MarginVault = await deploy("MarginVault", {
    from: deployer,
    contract: "MarginVault"
  });
  console.log(`MarginVault deployed at: ${MarginVault.address}`);

  //Controller deploy
  const gammaController = await deploy("Controller", {
    from: deployer,
    contract: "Controller",
    libraries: {
      MarginVault: MarginVault.address
    }
  });

  //Controller address set in AddressBook
  await addressBookDeployment.setController(gammaController.address);
  console.log(`Controller deployed at: ${gammaController.address}`);

  //Gnosis easy auction deploy
  const gnosisAuction = await deploy("GnosisAuction", {
    from: deployer,
    contract: "GnosisAuction"
  });

  console.log(`GnosisAuction deployed at: ${gnosisAuction.address}`);

};
main.tags = ["PREREQ_CONTRACTS"];

export default main;
