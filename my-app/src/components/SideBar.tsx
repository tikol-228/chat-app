import Button from "./Button"
import styles from "./SideBar.module.css"

const SideBar = () => {

  const handleCall = () => {
    
  }

  return (
    <>
      <section>
        <h2>Menu</h2>
        <div>
          <Button label="call" className={styles.button} onClick={handleCall} />
        </div>
      </section>
    </>
  )
}

export default SideBar