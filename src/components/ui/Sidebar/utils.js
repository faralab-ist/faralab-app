import PosChargeIcon from "../../../assets/pos_charge.svg";
import NegChargeIcon from "../../../assets/neg_charge.svg";
import WireIcon from "../../../assets/wire.svg";
import SphereIcon from "../../../assets/sphere.svg";
import CuboidIcon from "../../../assets/cuboid.svg";
import CylinderIcon from "../../../assets/cylinder.svg";
import PlaneIcon from "../../../assets/plane.svg";
import ChargeSphereIcon from "../../../assets/charge_sphere.svg";
import LowercaseQIcon from "../../../assets/lowercase_q2.svg";

export const POS_MIN = -10, POS_MAX = 10;
export const VAL_MIN = -5, VAL_MAX = 5;
export const DIM_MIN = 0.001, DIM_MAX = 10;
export const ERROR_MSG = `Please keep the value between ${VAL_MIN} and ${VAL_MAX}`;

// Configuração centralizada dos ícones
export const TYPE_CONFIG = {
  charge: { 
    icon: (obj) => (obj.charge < 0 ? NegChargeIcon : PosChargeIcon),
    alt: (obj) => (obj.charge < 0 ? "Negative Charge" : "Positive Charge")
  },
  testPointCharge: {
    icon: LowercaseQIcon,
    alt: 'Test Charge'
  },
  wire: { icon: WireIcon, alt: "Wire" },
  concentricInfWires: { icon: WireIcon, alt: "Concentric Wires" },
  plane: { icon: PlaneIcon, alt: "Plane" },
  stackedPlanes: { icon: PlaneIcon, alt: "Stacked Planes" },
  chargedSphere: { icon: ChargeSphereIcon, alt: "Charged Sphere" },
  concentricSpheres: { icon: ChargeSphereIcon, alt: "Concentric Spheres" },
  surface: {
    // Função para decidir qual ícone mostrar baseado nas propriedades
    resolve: (obj) => {
      if (obj.radius && obj.height) return { icon: CylinderIcon, alt: "Cylinder", subtype: 'cylinder' };
      if (obj.width && obj.height && obj.depth) return { icon: CuboidIcon, alt: "Cuboid", subtype: 'cuboid' };
      if (obj.radius) return { icon: SphereIcon, alt: "Sphere", subtype: 'sphere' };
      return { icon: SphereIcon, alt: "Sphere", subtype: 'surface' };
    }
  }
};